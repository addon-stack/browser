import {type Context, createContext, Script} from "node:vm";
import type {BrowserScriptExecution, BrowserScriptExecutor} from "../api";
import type {BrowserDocumentsHarness} from "../model";
import {clockEpoch, createRuntimeClock, type GuestTimer, type NodeScriptClock, type NodeScriptClockOptions} from "./clock";
import {CLOCK_DRIVER, CLOCK_KEY} from "./clock-driver";
import {coverageError, missingCoverageHelper, nodeError} from "./diagnostics";
import type {NodeScriptException} from "./executor";
import {RUNTIME_DRIVER, RUNTIME_KEY} from "./runtime-driver";

export interface NodeScriptRealm {
    readonly documentId: string;
    readonly world?: "MAIN" | "ISOLATED";
}

export interface NodeScriptBootstrap {
    readonly source: string;
    readonly filename?: string;
}

export interface NodeScriptRuntimeOptions {
    /** Explicit guest-only virtual time. Omitted means no timers and no Date replacement. */
    readonly clock?: true | NodeScriptClockOptions;
    /** Optional public registry. Bound mode requires live documents and follows their removal/reset. */
    readonly documents?: Pick<BrowserDocumentsHarness, "get" | "onRemoved">;
    /** Optional wall-clock limit per VM entry, including that entry's guest microtasks. No default limit. */
    readonly timeout?: number;
    readonly onScriptError?: (exception: NodeScriptException) => void;
}

export interface NodeScriptRuntime {
    readonly clock: NodeScriptClock | undefined;
    readonly executor: BrowserScriptExecutor;
    /** Synchronous classic script. A successful call recovers an invalidated realm; completion values are ignored. */
    evaluate(realm: NodeScriptRealm, script: NodeScriptBootstrap): void;
    readonly realmCount: number;
    readonly pendingExecutions: number;
    /** Terminal, idempotent cleanup, including document subscriptions. Registry reset is nonterminal. */
    dispose(): void;
}

interface Pending {
    request: BrowserScriptExecution;
    resolve(value: unknown): void;
    reject(error: unknown): void;
    unsubscribe(): void;
}

interface RealmState {
    context: Context;
    identity: Required<NodeScriptRealm>;
    pending: Map<number, Pending>;
}

/** Explicit document/world persistence for trusted code; no host objects, module loader, DOM or browser API bridge. */
export const createNodeScriptRuntime = (options: NodeScriptRuntimeOptions = {}): NodeScriptRuntime => {
    const {timeout, onScriptError, documents} = options;
    const epoch = options.clock === undefined ? undefined : clockEpoch(options.clock);

    if (timeout !== undefined && (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > 2147483647)) {
        throw nodeError("timeout must be a positive integer in milliseconds (at most 2147483647)");
    }

    const realms = new Map<string, RealmState>();
    // Keep diagnostic text only: retaining a VM Error/cause could keep the discarded guest realm alive.
    const invalidations = new Map<string, string>();
    const subscriptions = new Map<string, () => void>();
    const runOptions = timeout === undefined ? {} : {timeout};
    let sequence = 0;
    let disposed = false;
    const clockRef = `globalThis[${JSON.stringify(CLOCK_KEY)}]`;

    const clock = epoch === undefined ? undefined : createRuntimeClock<RealmState>(epoch, {
        isLive: realm => realms.get(key(realm.identity)) === realm,
        assertActive() {
            if (disposed) throw nodeError("runtime is disposed");
        },
        describe: realm => `document "${realm.identity.documentId}" world ${realm.identity.world}`,
        runOne(realm, timer) {
            enter(realm, `${clockRef}.runOne(${timer.id}); void 0;`, `addon-core-timer-${timer.id}.js`);
        },
    });

    const identity = (value: NodeScriptRealm): Required<NodeScriptRealm> => {
        if (!value || typeof value.documentId !== "string" || !value.documentId.trim()) throw nodeError("documentId must be a non-empty string");

        const world = value.world ?? "ISOLATED";

        if (world !== "MAIN" && world !== "ISOLATED") throw nodeError("unsupported execution world");

        return {documentId: value.documentId, world};
    };

    const key = (value: Required<NodeScriptRealm>): string => JSON.stringify([value.documentId, value.world]);

    const finish = (realm: RealmState, id: number, value: unknown, failed = false): void => {
        const pending = realm.pending.get(id);

        if (!pending) return;

        realm.pending.delete(id);
        pending.unsubscribe();

        if (failed) pending.reject(value);
        else pending.resolve(value);
    };

    const destroy = (realm: RealmState, error: Error): void => {
        if (realms.get(key(realm.identity)) === realm) realms.delete(key(realm.identity));

        clock?.forget(realm);

        for (const id of realm.pending.keys()) finish(realm, id, error, true);
    };

    const observeDocument = (documentId: string): void => {
        if (!documents) return;

        if (!documents.get(documentId)) throw nodeError(`document "${documentId}" does not exist in the bound registry`);

        if (subscriptions.has(documentId)) return;

        // Lifetime belongs to the document, not its realms: invalidation must not unsubscribe.
        const unsubscribe = documents.onRemoved(documentId, () => {
            if (subscriptions.get(documentId) !== unsubscribe) return;

            subscriptions.delete(documentId);
            unsubscribe();

            for (const realm of [...realms.values()]) {
                if (realm.identity.documentId === documentId) destroy(realm, nodeError(`document "${documentId}" was removed`));
            }

            for (const world of ["MAIN", "ISOLATED"] as const) invalidations.delete(key({documentId, world}));
        });

        subscriptions.set(documentId, unsubscribe);
    };

    const run = (realm: RealmState, source: string, filename = "addon-core-runtime.js"): unknown => {
        try {
            return new Script(source, {filename}).runInContext(realm.context, runOptions) as unknown;
        } catch (cause) {
            let detail = "Uninspectable VM exception";

            try {
                detail = String(cause);
            } catch {/* A malformed thrown value must not bypass invalidation. */}

            const error = nodeError(`document "${realm.identity.documentId}" world ${realm.identity.world}, ${filename}: ${detail}`, cause);
            // A VM failure may leave partial mutations. Never reuse that realm after a failed entry.
            invalidations.set(key(realm.identity), error.message);
            destroy(realm, error);
            throw error;
        }
    };

    const ensureRealm = (input: NodeScriptRealm, recovering = false): RealmState => {
        if (disposed) throw nodeError("runtime is disposed");

        const ref = identity(input);
        observeDocument(ref.documentId);
        const reason = invalidations.get(key(ref));

        if (reason !== undefined && !recovering) throw nodeError(`realm invalidated by ${reason}; bootstrap it again with runtime.evaluate()`);

        const existing = realms.get(key(ref));

        if (existing) return existing;

        const realm: RealmState = {
            identity: ref, pending: new Map(),
            context: createContext(Object.create(null), {
                name: `addon-core:${ref.documentId}:${ref.world}`,
                codeGeneration: {strings: false, wasm: false},
                microtaskMode: "afterEvaluate",
            }),
        };

        run(realm, RUNTIME_DRIVER);

        if (clock) {
            // Runtime-owned intrinsics are installed directly in the guest, not through data-only globals.
            run(realm, `Object.defineProperty(globalThis, ${JSON.stringify(CLOCK_KEY)}, {value: (${CLOCK_DRIVER})(${clock.api.now})}); void 0;`);
        }

        realms.set(key(ref), realm);

        return realm;
    };

    const drain = (realm: RealmState): void => {
        if (clock) {
            const snapshot = run(realm, `${clockRef}.snapshot()`);

            if (typeof snapshot !== "string") throw nodeError("invalid guest timer queue");

            clock.update(realm, JSON.parse(snapshot) as GuestTimer[]);
        }

        const encoded = run(realm, `globalThis[${JSON.stringify(RUNTIME_KEY)}].take()`);

        if (typeof encoded !== "string") throw nodeError("invalid runtime completion queue");

        const entries = JSON.parse(encoded) as {id: number; packet: string}[];

        for (const entry of entries) {
            // A diagnostic callback may remove/reset the document and even bootstrap a replacement with the same ID.
            if (realms.get(key(realm.identity)) !== realm) break;

            const pending = realm.pending.get(entry.id);

            if (!pending) continue;

            try {
                const packet = JSON.parse(entry.packet) as {kind: string; value?: unknown; name: string; message: string};

                if (packet.kind === "result") finish(realm, entry.id, packet.value);
                else if (packet.kind === "script-error") {
                    const source = pending.request.script.kind === "function" ? pending.request.script.source : "";
                    const helper = missingCoverageHelper(source, packet.name, packet.message);

                    if (helper) throw coverageError(helper);

                    onScriptError?.({target: pending.request.target, name: packet.name, message: packet.message});
                    finish(realm, entry.id, null);
                } else throw nodeError(packet.message ?? "invalid guest outcome");
            } catch (error) {
                finish(realm, entry.id, error, true);
            }
        }
    };

    // One delivery path for injections, bootstrap, cancellation and each individual timer callback.
    const enter = (realm: RealmState, source: string, filename?: string): void => {
        if (clock) run(realm, `${clockRef}.setNow(${clock.api.now}); void 0;`);

        run(realm, source, filename);
        drain(realm);
    };

    const executor: BrowserScriptExecutor = request => {
        try {
            if (disposed) throw nodeError("runtime is disposed");

            if (request.signal.aborted) throw nodeError("execution aborted", request.signal.reason);

            if (request.script.kind !== "function") throw nodeError("files are unsupported; pass classic source to runtime.evaluate()");

            if (typeof request.script.source !== "string" || !Array.isArray(request.script.args)) throw nodeError("invalid function source/args");

            const source = request.script.source;
            const args = JSON.stringify(request.script.args);

            if (args === undefined || !Array.isArray(JSON.parse(args))) throw nodeError("args must serialize to an array");

            if (request.signal.aborted) throw nodeError("execution aborted", request.signal.reason);

            if (documents) {
                const document = documents.get(request.target.documentId);

                if (!document) throw nodeError(`document "${request.target.documentId}" does not exist in the bound registry`);

                // Reject mismatched snapshots before ensureRealm can subscribe or allocate state.
                // Equal metadata is not proof of ownership: use one runtime per harness.
                for (const field of ["tabId", "frameId", "url"] as const) {
                    if (document[field] !== request.target[field]) {
                        throw nodeError(`target ${field} does not match document "${document.documentId}" in the bound registry`);
                    }
                }
            }

            const realm = ensureRealm({documentId: request.target.documentId, world: request.world});
            const id = ++sequence;

            return new Promise<unknown>((resolve, reject) => {
                const abort = () => {
                    finish(realm, id, nodeError("execution aborted", request.signal.reason), true);

                    if (realms.get(key(realm.identity)) !== realm || (documents && !documents.get(realm.identity.documentId))) return;

                    try {
                        enter(realm, `globalThis[${JSON.stringify(RUNTIME_KEY)}].cancel(${id}); void 0;`);
                    } catch {/* run already invalidated the failed realm and rejected its pending work */}
                };

                realm.pending.set(id, {
                    request, resolve, reject,
                    unsubscribe: () => request.signal.removeEventListener("abort", abort),
                });

                request.signal.addEventListener("abort", abort, {once: true});

                if (request.signal.aborted) return abort();

                try {
                    // Function expression is compiled in global scope, not inside the driver's closure.
                    enter(realm, `globalThis[${JSON.stringify(RUNTIME_KEY)}].start(${id}, (${source}), JSON.parse(${JSON.stringify(args)})); void 0;`, `addon-core-injection-${id}.js`);
                } catch (error) {
                    finish(realm, id, error, true);
                }
            });
        } catch (error) {
            return Promise.reject(error);
        }
    };

    return {
        clock: clock?.api,
        executor,
        evaluate(ref, script) {
            if (!script || typeof script.source !== "string") throw nodeError("bootstrap source must be classic JavaScript text");

            if (script.filename !== undefined && (typeof script.filename !== "string" || !script.filename.trim())) throw nodeError("filename must be a non-empty string");

            const realm = ensureRealm(ref, true);
            // Preserve classic-script global declarations. Ignore completion values, never return a guest Promise.
            enter(realm, `${script.source}\n;void 0;`, script.filename ?? "addon-core-bootstrap.js");

            // Clear only after the whole entry succeeds, never after a failed/reentrant recovery or disposal.
            if (realms.get(key(realm.identity)) === realm) invalidations.delete(key(realm.identity));
        },
        get realmCount() {
            return realms.size;
        },
        get pendingExecutions() {
            return [...realms.values()].reduce((count, realm) => count + realm.pending.size, 0);
        },
        dispose() {
            if (disposed) return;

            disposed = true;

            for (const realm of realms.values()) destroy(realm, nodeError("runtime is disposed"));

            invalidations.clear();

            for (const unsubscribe of subscriptions.values()) unsubscribe();

            subscriptions.clear();
        },
    };
};
