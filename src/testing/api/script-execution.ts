import type {BrowserContextsHarness, BrowserScriptTarget} from "../model";
import {scriptingError, selectScriptTargets} from "../model/injection-targets";

export type BrowserScriptSource =
    | {readonly kind: "function"; readonly source: string; readonly args: readonly unknown[]}
    | {readonly kind: "files"; readonly files: readonly string[]};

export interface BrowserScriptExecution {
    readonly target: BrowserScriptTarget;
    readonly script: BrowserScriptSource;
    readonly world: `${chrome.scripting.ExecutionWorld}`;
    readonly injectImmediately: boolean;
    readonly signal: AbortSignal;
}

/** Trusted adapter. The kit never invokes the injected function or reads script files itself. */
export type BrowserScriptExecutor = (execution: BrowserScriptExecution) => unknown;

type ScriptInjection = chrome.scripting.ScriptInjection<unknown[], unknown>;
type Results = chrome.scripting.InjectionResult<unknown>[];

const prepareScript = (injection: ScriptInjection): (() => BrowserScriptSource) => {
    if (!injection || typeof injection !== "object" || Array.isArray(injection)) throw scriptingError("injection must be an object");

    for (const key of Object.keys(injection)) {
        if (!["target", "func", "args", "files", "world", "injectImmediately"].includes(key)) throw scriptingError(`unsupported injection option "${key}"`);
    }

    if (injection.world !== undefined && !["ISOLATED", "MAIN"].includes(injection.world)) throw scriptingError("unsupported execution world");

    if (injection.injectImmediately !== undefined && typeof injection.injectImmediately !== "boolean") throw scriptingError("injectImmediately must be a boolean");

    if ((injection.func !== undefined) === (injection.files !== undefined)) throw scriptingError("provide exactly one of func or files");

    if (injection.files !== undefined) {
        if ("args" in injection) throw scriptingError("args is only supported with func");

        if (!Array.isArray(injection.files) || !injection.files.length || !injection.files.every(file => typeof file === "string" && file.length)) {
            throw scriptingError("files must be a non-empty array of paths");
        }

        const files = [...injection.files];

        return () => ({kind: "files", files: Object.freeze([...files])});
    }

    if (typeof injection.func !== "function") throw scriptingError("func must be a function");

    const source = Function.prototype.toString.call(injection.func);

    if (/\{\s*\[native code\]\s*\}$/.test(source)) throw scriptingError("native and bound functions cannot be serialized");

    const args = "args" in injection ? injection.args : [];

    if (!Array.isArray(args)) throw scriptingError("args must be an array");

    let serialized: string;

    try {
        serialized = JSON.stringify(args);

        if (!serialized || !Array.isArray(JSON.parse(serialized))) throw new Error("args must serialize to an array");
    } catch (cause) {
        throw scriptingError("args must be JSON-serializable", cause);
    }

    // Snapshot now; every target receives its own data, never the caller's live function/closure.
    return () => ({kind: "function", source, args: JSON.parse(serialized) as unknown[]});
};

export const createScriptExecutionHarness = (contexts: BrowserContextsHarness, hasTab: (tabId: number) => boolean) => {
    let executor: BrowserScriptExecutor | undefined;
    let resetting = false;
    let generation = 0;
    const pending = new Set<(error: Error) => void>();
    const selectTargets = (target: chrome.scripting.InjectionTarget) => selectScriptTargets(target, contexts, hasTab);

    const execute = (injection: ScriptInjection): Promise<Results> => {
        if (resetting) return Promise.reject(scriptingError("executor is being reset"));

        let targets: readonly BrowserScriptTarget[];
        let makeScript: () => BrowserScriptSource;
        const run = executor;
        const requestGeneration = generation;

        try {
            if (!run) throw scriptingError("no executor configured; use scripting.setExecutor() or executeScript.setResult()");

            makeScript = prepareScript(injection);
            targets = selectTargets(injection.target);

            // Argument toJSON hooks can reset the harness. Never resurrect the captured old executor afterward.
            if (generation !== requestGeneration) throw scriptingError("execution cancelled by reset");
        } catch (error) {
            return Promise.reject(error);
        }

        const world = injection.world ?? "ISOLATED";
        const injectImmediately = injection.injectImmediately ?? false;

        return new Promise<Results>((resolve, reject) => {
            const controller = new AbortController();
            const subscriptions: (() => void)[] = [];
            let settled = false;

            const release = () => {
                pending.delete(cancel);

                subscriptions.splice(0).forEach(unsubscribe => {
                    unsubscribe();
                });
            };

            const cancel = (error: Error) => {
                if (settled) return;

                settled = true;
                release();
                reject(error);
                controller.abort(error);
            };

            pending.add(cancel);

            try {
                for (const target of targets) {
                    subscriptions.push(contexts.documents.onRemoved(target.documentId, () => {
                        cancel(scriptingError(`target document "${target.documentId}" was removed`));
                    }));

                    for (const id of target.contextIds) {
                        const context = contexts.get(id);

                        if (!context || context.disposed) throw scriptingError(`target context "${id}" was disposed`);

                        subscriptions.push(context.onDispose(() => {
                            cancel(scriptingError(`target context "${id}" was disposed`));
                        }));
                    }
                }
            } catch (error) {
                cancel(scriptingError("target is no longer available", error));

                return;
            }

            // Each task is observed even if a sibling fails or a target disappears while it is running.
            const tasks = targets.map(async target => {
                try {
                    if (settled) throw controller.signal.reason;

                    const result = await run({target, script: makeScript(), world, injectImmediately, signal: controller.signal});

                    if (settled) throw controller.signal.reason;

                    // A portable adapter-data boundary, also in jsdom without global structuredClone.
                    // Preserve top-level undefined; otherwise use the explicitly documented JSON subset.
                    const serialized = result === undefined ? undefined : JSON.stringify(result);

                    if (result !== undefined && serialized === undefined) throw scriptingError("executor result is not JSON-serializable");

                    return {frameId: target.frameId, documentId: target.documentId, result: serialized === undefined ? undefined : JSON.parse(serialized)};
                } catch (cause) {
                    // Include details in the message too: callback lastError does not transport Error.cause.
                    const detail = cause instanceof Error ? cause.message : String(cause);

                    throw scriptingError(`executor failed for document "${target.documentId}": ${detail}`, cause);
                }
            });

            Promise.all(tasks).then(results => {
                if (settled) return;

                settled = true;
                release();
                resolve(results);
            }, error => {
                cancel(error);
            });
        });
    };

    return {
        execute,
        selectTargets,
        get pendingExecutions() {
            return pending.size;
        },
        setExecutor(value: BrowserScriptExecutor | undefined): void {
            executor = value;
        },
        cancelExecutions(): void {
            for (const cancel of [...pending]) cancel(scriptingError("execution cancelled by test"));
        },
        reset(): void {
            generation++;
            resetting = true;
            executor = undefined;

            try {
                for (const cancel of [...pending]) cancel(scriptingError("execution cancelled by reset"));
            } finally {
                executor = undefined;
                resetting = false;
            }
        },
    };
};
