import type {BrowserContext, BrowserContextsHarness, BrowserIgnoredMessageRejection, BrowserMessageChannelInfo} from "../model";
import type {BrowserMemoryState} from "../model/browser-state";
import {createMessageChannels, messageFailure} from "../model/message-channel";
import {type BrowserHarnessCall, type BrowserMethod, createBrowserMethod} from "../primitives";
import {createLastErrorController, type RuntimeLastErrorController} from "../primitives/last-error";
import type {BrowserTestApi} from "../types";
import {contextSender, messageRecipients, runtimeMessage, tabMessage} from "./message-routing";

export interface BrowserContextMessaging {
    readonly context: BrowserContext;
    readonly chrome: BrowserTestApi;
    readonly browser: BrowserTestApi;
    readonly runtime: {
        readonly sendMessage: BrowserMethod<typeof chrome.runtime.sendMessage, unknown>;
        readonly onMessage: BrowserContext["onMessage"];
    };
    readonly tabs: {readonly sendMessage: BrowserMethod<typeof chrome.tabs.sendMessage, unknown>};
    readonly calls: readonly BrowserHarnessCall[];
}

export interface BrowserMessagingHarness {
    /** Contextual dispatch only. Snapshotted per send; reset restores "accept", independent of profile. */
    promiseListeners: "accept" | "ignore";
    /** Ignored returned-Promise failures are observed, not logged or turned into responses. Reset clears the buffer. */
    readonly ignoredPromiseRejections: readonly BrowserIgnoredMessageRejection[];
    forContext(context: BrowserContext | string): BrowserContextMessaging;
    readonly pendingChannels: readonly BrowserMessageChannelInfo[];
    readonly calls: readonly BrowserHarnessCall[];
    /** Force-close all routed channels, or channels involving this context. Does not dispose contexts. */
    closeChannels(context?: BrowserContext | string): void;
    /** Cancel routed calls and reset their controls and context-local message subscriptions. */
    reset(): void;
}

// Read-only live overlays: capability changes remain visible, and no global current-context variable is needed.
const overlay = <T extends object>(source: () => T, overrides: Readonly<Record<string, () => unknown>>): T =>
    new Proxy({} as T, {
        get: (_target, key) => Reflect.has(source(), key) && typeof key === "string" && Object.hasOwn(overrides, key)
            ? overrides[key]() : Reflect.get(source(), key),
        has: (_target, key) => Reflect.has(source(), key),
        ownKeys: () => Reflect.ownKeys(source()),
        getOwnPropertyDescriptor: (_target, key) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(source(), key);

            if (!descriptor) return undefined;

            return {configurable: true, enumerable: descriptor.enumerable, get: () =>
                typeof key === "string" && Object.hasOwn(overrides, key) ? overrides[key]() : Reflect.get(source(), key)};
        },
        set: () => {
            throw new Error("Context API facades are read-only; use harness controls.");
        },
        defineProperty: () => false,
        deleteProperty: () => false,
        preventExtensions: () => false,
    });

export const createMessagingHarness = (
    contexts: BrowserContextsHarness,
    facades: {chrome: BrowserTestApi; browser: BrowserTestApi},
    state: BrowserMemoryState,
    rootLastError: RuntimeLastErrorController,
    getExtensionId: () => string,
    nextSequence: () => number
): BrowserMessagingHarness => {
    const channels = createMessageChannels();
    let promiseListeners: BrowserMessagingHarness["promiseListeners"] = "accept";
    const bindings = new Map<BrowserContext, BrowserContextMessaging>();

    const resolveContext = (value: BrowserContext | string): BrowserContext => {
        const context = typeof value === "string" ? contexts.get(value) : value;

        if (!context || context.disposed || contexts.get(context.info.contextId) !== context) {
            throw new Error("Browser messaging requires a live context belonging to this harness.");
        }

        return context;
    };

    return {
        get promiseListeners() {
            return promiseListeners;
        },
        set promiseListeners(value) {
            if (value !== "accept" && value !== "ignore") throw new Error('Browser messaging promiseListeners must be "accept" or "ignore".');

            promiseListeners = value;
        },
        get ignoredPromiseRejections() {
            return channels.ignoredRejections;
        },
        get pendingChannels() {
            return channels.pending;
        },
        get calls() {
            return [...bindings.values()].flatMap(view => view.calls).sort((a, b) => a.sequence - b.sequence);
        },
        closeChannels(context) {
            channels.close(context === undefined ? undefined : resolveContext(context));
        },
        reset() {
            channels.reset();
            promiseListeners = "accept";

            for (const [context, view] of bindings) {
                view.runtime.sendMessage.reset();
                view.tabs.sendMessage.reset();

                if (context.disposed) bindings.delete(context);
            }

            for (const info of contexts.list()) contexts.get(info.contextId)!.onMessage.reset();
        },
        forContext(value) {
            const context = resolveContext(value);
            const existing = bindings.get(context);

            if (existing) return existing;

            const lastError = createLastErrorController();

            const invoke = (api: BrowserMessageChannelInfo["api"], raw: readonly unknown[]): Promise<unknown> | undefined => {
                const callback = typeof raw.at(-1) === "function" ? raw.at(-1) as (value?: unknown) => void : undefined;
                const args = callback ? raw.slice(0, -1) : raw;
                let response: Promise<unknown>;

                try {
                    if (context.disposed || contexts.get(context.info.contextId) !== context) throw messageFailure(api, "sender context was disposed.");

                    const target = api === "tabs.sendMessage" ? tabMessage(args) : undefined;

                    if (target && context.info.kind === "contentScript") throw messageFailure(api, "content scripts must use runtime.sendMessage.");

                    if (target && !state.tabs.has(target.tabId)) throw messageFailure(api, `No tab with id: ${target.tabId}.`);

                    const message = target ? target.message : runtimeMessage(args, getExtensionId());

                    response = channels.dispatch({
                        api, source: context, message,
                        promiseListeners, callback: callback !== undefined,
                        recipients: messageRecipients(contexts, context, target),
                        sender: contextSender(context, getExtensionId(), state, target !== undefined),
                    });
                } catch (error) {
                    response = Promise.reject(error);
                }

                if (!callback) return response;

                void response.then(value => callback(value), error => lastError.runWithLastError(error, () => callback()));

                return undefined;
            };

            const runtimeSend = createBrowserMethod<typeof chrome.runtime.sendMessage, unknown>({
                name: "runtime.sendMessage", invocation: "dual", lastError, nextSequence,
                implementation: ((...args: unknown[]) => invoke("runtime.sendMessage", args)) as typeof chrome.runtime.sendMessage,
            });

            const tabSend = createBrowserMethod<typeof chrome.tabs.sendMessage, unknown>({
                name: "tabs.sendMessage", invocation: "dual", lastError, nextSequence,
                implementation: ((...args: unknown[]) => invoke("tabs.sendMessage", args)) as typeof chrome.tabs.sendMessage,
            });

            const facade = (kind: "chrome" | "browser"): BrowserTestApi => {
                const runtime = overlay(() => facades[kind].runtime, {
                    onMessage: () => context.onMessage.api,
                    sendMessage: () => runtimeSend.api,
                    lastError: () => lastError.current ?? rootLastError.current,
                });

                const tabs = overlay(() => facades[kind].tabs, {sendMessage: () => tabSend.api});

                return overlay(() => facades[kind], {runtime: () => runtime, tabs: () => tabs});
            };

            const view: BrowserContextMessaging = {
                context, chrome: facade("chrome"), browser: facade("browser"),
                runtime: {sendMessage: runtimeSend, onMessage: context.onMessage}, tabs: {sendMessage: tabSend},
                get calls() {
                    return ([["runtime.sendMessage", runtimeSend], ["tabs.sendMessage", tabSend]] as const)
                        .flatMap(([api, method]) => method.calls.map(call => ({
                            ...call, api, contextId: context.info.contextId,
                        }))).sort((a, b) => a.sequence - b.sequence);
                },
            };

            bindings.set(context, view);

            return view;
        },
    };
};
