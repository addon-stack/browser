import {createContext, Script} from "node:vm";
import type {BrowserScriptExecutor} from "../api";
import type {BrowserScriptTarget} from "../model";
import {GUEST_DRIVER} from "./guest-source";

export interface NodeScriptException {
    readonly target: BrowserScriptTarget;
    readonly name: string;
    readonly message: string;
}

export interface NodeScriptExecutorOptions {
    /** Plain JSON data only; copied into a fresh realm for every target and call. Not live DOM objects/functions. */
    readonly globals?: Readonly<Record<string, unknown>> | ((target: BrowserScriptTarget) => Readonly<Record<string, unknown>>);
    /** Optional wall-clock limit in milliseconds for synchronous VM evaluation, not an async deadline. */
    readonly timeout?: number;
    /** Observe injected-code exceptions, which otherwise become null results (measured Chrome behavior). */
    readonly onScriptError?: (exception: NodeScriptException) => void;
}

const nodeError = (message: string, cause?: unknown): Error => new Error(`Node script executor: ${message}`, {cause});

const missingCoverageHelper = (source: string, name: string, message: string): string | undefined => {
    if (name !== "ReferenceError") return undefined;

    const helper = /^(cov_[\w$]+) is not defined$/.exec(message)?.[1];

    // Match an actual missing-helper failure, not a harmless mention in a string/comment or a locally bound function.
    return helper && [...source.matchAll(/\bcov_[\w$]+\s*\(\s*\)/g)].some(call => call[0].replace(/\s/g, "") === `${helper}()`)
        ? helper : undefined;
};

const serializeData = (value: unknown): string => {
    const ancestors = new Set<object>();

    const validate = (input: unknown, depth: number): void => {
        if (depth > 100) throw nodeError("globals/args exceed the supported nesting depth (100)");

        if (input === null || typeof input === "string" || typeof input === "boolean" || (typeof input === "number" && Number.isFinite(input))) return;

        if (typeof input !== "object") throw nodeError("globals/args must contain only JSON data; functions and non-finite values are unsupported");

        if (ancestors.has(input)) throw nodeError("globals/args must not contain cycles");

        const prototype = Object.getPrototypeOf(input);

        if (!Array.isArray(input) && prototype !== null && Object.getPrototypeOf(prototype) !== null) {
            throw nodeError("globals/args must use plain data objects, not DOM or class instances");
        }

        ancestors.add(input);

        for (const key of Reflect.ownKeys(input)) {
            if (Array.isArray(input) && key === "length") continue;

            const descriptor = Object.getOwnPropertyDescriptor(input, key)!;

            if (typeof key === "symbol" || !("value" in descriptor)) throw nodeError("globals/args must not contain symbols or accessors");

            validate(descriptor.value, depth + 1);
        }

        ancestors.delete(input);
    };

    validate(value, 0);

    return JSON.stringify(value);
};

/** Explicit, trusted-code execution only. node:vm is not a security boundary. */
export const createNodeScriptExecutor = (options: NodeScriptExecutorOptions = {}): BrowserScriptExecutor => {
    const {globals = {}, timeout, onScriptError} = options;

    if (timeout !== undefined && (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 2147483647)) {
        throw nodeError("timeout must be a positive integer in milliseconds (at most 2147483647)");
    }

    // Snapshot a static fixture once, not at each call after a consumer may have mutated it.
    const staticGlobals = typeof globals === "function" ? undefined : serializeData(globals);

    return ({target, script, signal}) => {
        if (signal.aborted) return Promise.reject(nodeError("execution aborted", signal.reason));

        if (script.kind !== "function") throw nodeError("files are unsupported; provide a function or a different executor");

        const globalsText = staticGlobals ?? serializeData((globals as (target: BrowserScriptTarget) => Readonly<Record<string, unknown>>)(target));
        const argsText = serializeData(script.args);

        if (signal.aborted) return Promise.reject(nodeError("execution aborted", signal.reason));

        const context = createContext(Object.create(null), {
            name: `addon-core:${target.documentId}`,
            codeGeneration: {strings: false, wasm: false},
        });

        const runOptions = timeout === undefined ? {} : {timeout};
        const functionKey = "__addon_core_injected_function__";

        const setup = new Script(`(function(data) {
            if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("globals must be a dictionary");
            for (const key of Object.keys(data)) {
                if (key in globalThis || key === ${JSON.stringify(functionKey)}) throw new Error("Cannot replace intrinsic global: " + key);
                Object.defineProperty(globalThis, key, {value: data[key], writable: true, configurable: true, enumerable: true});
            }
        })(JSON.parse(${JSON.stringify(globalsText)}))`, {filename: "addon-core-node-globals.js"});

        setup.runInContext(context, runOptions);
        const fn = new Script(`(${script.source})`, {filename: `addon-core-script-${target.documentId}.js`}).runInContext(context, runOptions) as unknown;

        if (typeof fn !== "function") throw nodeError("serialized source must evaluate to a function expression");

        context[functionKey] = fn;

        // The call itself stays inside runInContext: invoking the returned function in the host would bypass timeout.
        const invocation = new Script(`(function() {
            const fn = globalThis[${JSON.stringify(functionKey)}];
            delete globalThis[${JSON.stringify(functionKey)}];
            return ${GUEST_DRIVER}(fn, JSON.parse(${JSON.stringify(argsText)}));
        })()`, {filename: `addon-core-invoke-${target.documentId}.js`});

        const result = invocation.runInContext(context, runOptions) as unknown;

        return new Promise<unknown>((resolve, reject) => {
            let settled = false;

            const finish = (error?: unknown, value?: unknown, failed = false) => {
                if (settled) return;

                settled = true;
                signal.removeEventListener("abort", abort);

                if (failed) reject(error);
                else resolve(value);
            };

            const abort = () => {
                finish(nodeError("execution aborted", signal.reason), undefined, true);
            };

            signal.addEventListener("abort", abort, {once: true});

            // Observe even a late rejection after cancellation. There are no host timers or implicit timeouts.
            Promise.resolve(result).then(packet => {
                if (settled) return;

                try {
                    if (typeof packet !== "string") throw nodeError("invalid guest outcome");

                    const outcome = JSON.parse(packet) as {kind: string; value?: unknown; name: string; message: string};

                    if (outcome.kind === "script-error") {
                        const coverageHelper = missingCoverageHelper(script.source, outcome.name, outcome.message);

                        if (coverageHelper) {
                            throw nodeError(`Istanbul coverage instrumentation references missing helper "${coverageHelper}" in injected func. Exclude the injected function module from instrumentation or provide uninstrumented source; coverage counters cannot access the test's closure.`);
                        }

                        onScriptError?.({target, name: outcome.name, message: outcome.message});
                        finish(undefined, null);
                    } else if (outcome.kind === "result") finish(undefined, outcome.value);
                    else throw nodeError(outcome.message ?? "invalid guest outcome");
                } catch (error) {
                    finish(error, undefined, true);
                }
            }, error => {
                finish(nodeError("guest driver failed", error), undefined, true);
            });

            if (signal.aborted) abort();
        });
    };
};
