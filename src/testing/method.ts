export type BrowserMethodInvocationStyle = "sync" | "callback" | "promise" | "dual" | "promise-tolerant" | "hybrid";

export type BrowserMethodObservedInvocation = "sync" | "callback" | "promise" | "promise-tolerant" | "hybrid";

export type BrowserMethodInvocation = BrowserMethodObservedInvocation;

export type BrowserMethodCallback = (...args: unknown[]) => unknown;

export interface BrowserMethodLastErrorController {
    runWithLastError<T>(error: unknown, callback: () => T): T;
}

export interface BrowserMethodCall {
    readonly sequence: number;
    readonly args: readonly unknown[];
    readonly callback: BrowserMethodCallback | undefined;
    readonly invocation: BrowserMethodObservedInvocation;
    readonly callbackCalls: readonly (readonly unknown[])[];
}

type BrowserMethodFunction = (...args: never[]) => unknown;

export interface BrowserMethodOptions<TApi extends BrowserMethodFunction, TResult> {
    readonly name: string;
    readonly invocation: BrowserMethodInvocationStyle;
    readonly callback?: "last";
    readonly callbackArgs?: (result: TResult) => readonly unknown[];
    readonly implementation?: TApi;
    readonly lastError?: BrowserMethodLastErrorController;
    readonly nextSequence?: () => number;
}

export interface BrowserMethod<TApi extends BrowserMethodFunction, TResult> {
    readonly api: TApi;
    readonly calls: readonly BrowserMethodCall[];
    /** Whether the constructor/default baseline supplies an implementation. */
    readonly hasDefaultImplementation: boolean;
    setResult(value: TResult): void;
    queueResult(...values: readonly TResult[]): void;
    setImplementation(implementation: TApi): void;
    setDefaultImplementation(implementation: TApi | undefined): void;
    failNext(error: unknown): void;
    reset(): void;
}

interface MutableBrowserMethodCall {
    sequence: number;
    args: unknown[];
    callback: BrowserMethodCallback | undefined;
    invocation: BrowserMethodObservedInvocation;
    callbackCalls: unknown[][];
}

interface ConfiguredResult<TResult> {
    configured: true;
    value: TResult;
}

const UNCONFIGURED_RESULT = {configured: false} as const;

function methodConfigurationError(name: string, message: string): Error {
    return new Error(`Browser method "${name}" ${message}`);
}

function observedInvocation(
    style: BrowserMethodInvocationStyle,
    hasCallback: boolean
): BrowserMethodObservedInvocation {
    switch (style) {
        case "dual":
            return hasCallback ? "callback" : "promise";
        case "promise-tolerant":
            return "promise-tolerant";
        default:
            return style;
    }
}

function immutableCall(call: MutableBrowserMethodCall): BrowserMethodCall {
    return Object.freeze({
        sequence: call.sequence,
        args: Object.freeze([...call.args]),
        callback: call.callback,
        invocation: call.invocation,
        callbackCalls: Object.freeze(call.callbackCalls.map(args => Object.freeze([...args]))),
    });
}

/**
 * Creates a small configurable browser method without depending on a test runner.
 */
export function createBrowserMethod<TApi extends BrowserMethodFunction, TResult>(
    options: BrowserMethodOptions<TApi, TResult>
): BrowserMethod<TApi, TResult> {
    let sequence = 0;
    let calls: MutableBrowserMethodCall[] = [];
    let queuedResults: TResult[] = [];
    let queuedErrors: unknown[] = [];
    let result: ConfiguredResult<TResult> | typeof UNCONFIGURED_RESULT = UNCONFIGURED_RESULT;
    let implementation: TApi | undefined;
    let defaultImplementation = options.implementation;

    const recognizesCallback =
        options.callback === "last" ||
        options.invocation === "callback" ||
        options.invocation === "promise" ||
        options.invocation === "dual" ||
        options.invocation === "promise-tolerant" ||
        options.invocation === "hybrid";

    const invoke = (...rawArgs: unknown[]): unknown => {
        const possibleCallback = recognizesCallback ? rawArgs.at(-1) : undefined;
        const callback =
            typeof possibleCallback === "function" ? (possibleCallback as BrowserMethodCallback) : undefined;
        const args = callback ? rawArgs.slice(0, -1) : [...rawArgs];
        const invocation = observedInvocation(options.invocation, callback !== undefined);
        const call: MutableBrowserMethodCall = {
            sequence: options.nextSequence?.() ?? ++sequence,
            args,
            callback,
            invocation,
            callbackCalls: [],
        };
        calls.push(call);

        const trackedCallback: BrowserMethodCallback | undefined = callback
            ? (...callbackArgs) => {
                  call.callbackCalls.push([...callbackArgs]);
                  return callback(...callbackArgs);
              }
            : undefined;

        if (options.invocation === "callback" && !callback) {
            throw methodConfigurationError(options.name, "requires a callback as its final argument.");
        }

        if (options.invocation === "promise" && callback) {
            return Promise.reject(
                methodConfigurationError(options.name, "is promise-only and does not accept a callback argument.")
            );
        }

        const isCallbackInvocation =
            options.invocation === "callback" ||
            (options.invocation === "dual" && callback !== undefined) ||
            (options.invocation === "hybrid" && callback !== undefined);
        const isPromiseInvocation =
            options.invocation === "promise" ||
            options.invocation === "promise-tolerant" ||
            (options.invocation === "dual" && callback === undefined) ||
            (options.invocation === "hybrid" && callback === undefined);

        if (queuedErrors.length > 0) {
            const error = queuedErrors.shift();

            if (isCallbackInvocation && trackedCallback) {
                if (!options.lastError) {
                    throw methodConfigurationError(
                        options.name,
                        "cannot expose a callback error without a lastError controller."
                    );
                }

                const callWithError = () => trackedCallback();
                options.lastError.runWithLastError(error, callWithError);

                return undefined;
            }

            if (isPromiseInvocation) {
                return Promise.reject(error);
            }

            throw error;
        }

        const hasQueuedResult = queuedResults.length > 0;
        const configuredResult = hasQueuedResult
            ? ({configured: true, value: queuedResults.shift() as TResult} satisfies ConfiguredResult<TResult>)
            : result;
        const activeImplementation = implementation ?? defaultImplementation;

        if (configuredResult.configured && (hasQueuedResult || !implementation)) {
            if (isCallbackInvocation && trackedCallback) {
                const callbackArgs =
                    options.callbackArgs?.(configuredResult.value) ??
                    (typeof configuredResult.value === "undefined" ? [] : [configuredResult.value]);
                trackedCallback(...callbackArgs);
                return undefined;
            }

            if (isPromiseInvocation) {
                return Promise.resolve(configuredResult.value);
            }

            return configuredResult.value;
        }

        if (activeImplementation) {
            const implementationArgs = [...args];

            if (trackedCallback && options.invocation !== "promise-tolerant" && options.invocation !== "promise") {
                implementationArgs.push(trackedCallback);
            }

            let implementationResult: unknown;

            try {
                implementationResult = Reflect.apply(activeImplementation, undefined, implementationArgs);
            } catch (error) {
                if (isPromiseInvocation) {
                    return Promise.reject(error);
                }

                throw error;
            }

            if (options.invocation === "hybrid") {
                return implementationResult;
            }

            if (isCallbackInvocation) {
                return undefined;
            }

            if (isPromiseInvocation) {
                return Promise.resolve(implementationResult);
            }

            return implementationResult;
        }

        const error = methodConfigurationError(
            options.name,
            "was called without a configured result or implementation."
        );

        if (isPromiseInvocation) {
            return Promise.reject(error);
        }

        throw error;
    };

    return {
        api: invoke as unknown as TApi,
        get calls() {
            return Object.freeze(calls.map(immutableCall));
        },
        get hasDefaultImplementation() {
            return defaultImplementation !== undefined;
        },
        setResult(value) {
            implementation = undefined;
            result = {configured: true, value};
        },
        queueResult(...values) {
            queuedResults.push(...values);
        },
        setImplementation(value) {
            result = UNCONFIGURED_RESULT;
            implementation = value;
        },
        setDefaultImplementation(value) {
            defaultImplementation = value;
        },
        failNext(error) {
            queuedErrors.push(error);
        },
        reset() {
            // Keep the default implementation: reset restores the current default/stateful
            // baseline while clearing call history and one-off consumer configuration.
            sequence = 0;
            calls = [];
            queuedResults = [];
            queuedErrors = [];
            result = UNCONFIGURED_RESULT;
            implementation = undefined;
        },
    };
}
