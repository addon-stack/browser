import {type BrowserEventHarness, createBrowserEvent} from "./event";
import {createManifestFixture, createMessageSenderFixture} from "./fixtures";
import {cloneRecord, matchesContextFilter} from "./internal";
import {type BrowserMethod, createBrowserMethod} from "./method";
import type {RuntimeLastErrorController, RuntimeTestApi} from "./types";

type ListenerArgs<TEvent extends {addListener(listener: (...args: never[]) => unknown, ...args: never[]): unknown}> =
    Parameters<Parameters<TEvent["addListener"]>[0]>;

type InstalledArgs = ListenerArgs<typeof chrome.runtime.onInstalled>;
type StartupArgs = ListenerArgs<typeof chrome.runtime.onStartup>;
type MessageArgs = ListenerArgs<typeof chrome.runtime.onMessage>;
type ConnectArgs = ListenerArgs<typeof chrome.runtime.onConnect>;
type ConnectExternalArgs = ListenerArgs<typeof chrome.runtime.onConnectExternal>;
type MessageExternalArgs = ListenerArgs<typeof chrome.runtime.onMessageExternal>;
type RestartRequiredArgs = ListenerArgs<typeof chrome.runtime.onRestartRequired>;
type SuspendArgs = ListenerArgs<typeof chrome.runtime.onSuspend>;
type SuspendCanceledArgs = ListenerArgs<typeof chrome.runtime.onSuspendCanceled>;
type UpdateAvailableArgs = ListenerArgs<typeof chrome.runtime.onUpdateAvailable>;
type UserScriptConnectArgs = ListenerArgs<typeof chrome.runtime.onUserScriptConnect>;
type UserScriptMessageArgs = ListenerArgs<typeof chrome.runtime.onUserScriptMessage>;

interface RequestUpdateCheckResult {
    status: `${chrome.runtime.RequestUpdateCheckStatus}`;
    details?: chrome.runtime.UpdateCheckDetails;
}

export interface RuntimeHarnessOptions {
    extensionId?: string;
    manifest?: chrome.runtime.Manifest;
    contexts?: readonly chrome.runtime.ExtensionContext[];
    messageSender?: chrome.runtime.MessageSender;
}

export interface RuntimeEventsHarness {
    onConnect: BrowserEventHarness<ConnectArgs>;
    onConnectExternal: BrowserEventHarness<ConnectExternalArgs>;
    onInstalled: BrowserEventHarness<InstalledArgs>;
    onMessage: BrowserEventHarness<MessageArgs>;
    onMessageExternal: BrowserEventHarness<MessageExternalArgs>;
    onRestartRequired: BrowserEventHarness<RestartRequiredArgs>;
    onStartup: BrowserEventHarness<StartupArgs>;
    onSuspend: BrowserEventHarness<SuspendArgs>;
    onSuspendCanceled: BrowserEventHarness<SuspendCanceledArgs>;
    onUpdateAvailable: BrowserEventHarness<UpdateAvailableArgs>;
    onUserScriptConnect: BrowserEventHarness<UserScriptConnectArgs>;
    onUserScriptMessage: BrowserEventHarness<UserScriptMessageArgs>;
}

export interface RuntimeHarness {
    readonly chromeApi: RuntimeTestApi;
    readonly browserApi: RuntimeTestApi;
    readonly connect: BrowserMethod<typeof chrome.runtime.connect, chrome.runtime.Port>;
    readonly connectNative: BrowserMethod<typeof chrome.runtime.connectNative, chrome.runtime.Port>;
    readonly getContexts: BrowserMethod<typeof chrome.runtime.getContexts, chrome.runtime.ExtensionContext[]>;
    readonly getManifest: BrowserMethod<typeof chrome.runtime.getManifest, chrome.runtime.Manifest>;
    readonly getPackageDirectoryEntry: BrowserMethod<
        typeof chrome.runtime.getPackageDirectoryEntry,
        FileSystemDirectoryEntry
    >;
    readonly getPlatformInfo: BrowserMethod<typeof chrome.runtime.getPlatformInfo, chrome.runtime.PlatformInfo>;
    readonly getBrowserInfo: BrowserMethod<typeof browser.runtime.getBrowserInfo, browser.runtime.BrowserInfo>;
    readonly getURL: BrowserMethod<typeof chrome.runtime.getURL, string>;
    readonly openOptionsPage: BrowserMethod<typeof chrome.runtime.openOptionsPage, void>;
    readonly reload: BrowserMethod<typeof chrome.runtime.reload, void>;
    readonly requestUpdateCheck: BrowserMethod<typeof chrome.runtime.requestUpdateCheck, RequestUpdateCheckResult>;
    readonly restart: BrowserMethod<typeof chrome.runtime.restart, void>;
    readonly restartAfterDelay: BrowserMethod<typeof chrome.runtime.restartAfterDelay, void>;
    readonly sendMessage: BrowserMethod<typeof chrome.runtime.sendMessage, unknown>;
    readonly setUninstallURL: BrowserMethod<typeof chrome.runtime.setUninstallURL, void>;
    readonly events: RuntimeEventsHarness;
    readonly messageSender: chrome.runtime.MessageSender;
    readonly contexts: readonly chrome.runtime.ExtensionContext[];
    readonly manifest: chrome.runtime.Manifest;
    readonly id: string;
    readonly lastError: chrome.runtime.LastError | undefined;
    setExtensionId(id: string): void;
    setUrlScheme(scheme: "chrome-extension" | "moz-extension" | "safari-web-extension"): void;
    setManifest(manifest: chrome.runtime.Manifest): void;
    setContexts(contexts: readonly chrome.runtime.ExtensionContext[]): void;
    addContext(context: chrome.runtime.ExtensionContext): void;
    removeContext(contextId: string): void;
    setMessageSender(sender: chrome.runtime.MessageSender): void;
    emitMessage(message: unknown): Promise<unknown>;
    closeMessageChannels(): void;
    reset(): void;
}

const eventApi = <TArgs extends readonly unknown[]>(
    event: BrowserEventHarness<TArgs>
): chrome.events.Event<(...args: TArgs) => void> =>
    event.api as unknown as chrome.events.Event<(...args: TArgs) => void>;

export const createRuntimeHarness = (
    options: RuntimeHarnessOptions,
    lastError: RuntimeLastErrorController,
    nextSequence?: () => number
): RuntimeHarness => {
    const initialId = options.extensionId ?? "test-extension-id";
    const initialManifest = createManifestFixture(options.manifest);
    const initialContexts = (options.contexts ?? []).map(context => cloneRecord(context));
    const initialSender = createMessageSenderFixture(options.messageSender);

    let extensionId = initialId;
    let urlScheme: "chrome-extension" | "moz-extension" | "safari-web-extension" = "chrome-extension";
    let manifest = initialManifest;
    let contexts = initialContexts;
    let messageSender = initialSender;

    const events: RuntimeEventsHarness = {
        onConnect: createBrowserEvent<ConnectArgs>(),
        onConnectExternal: createBrowserEvent<ConnectExternalArgs>(),
        onInstalled: createBrowserEvent<InstalledArgs>(),
        onMessage: createBrowserEvent<MessageArgs>(),
        onMessageExternal: createBrowserEvent<MessageExternalArgs>(),
        onRestartRequired: createBrowserEvent<RestartRequiredArgs>(),
        onStartup: createBrowserEvent<StartupArgs>(),
        onSuspend: createBrowserEvent<SuspendArgs>(),
        onSuspendCanceled: createBrowserEvent<SuspendCanceledArgs>(),
        onUpdateAvailable: createBrowserEvent<UpdateAvailableArgs>(),
        onUserScriptConnect: createBrowserEvent<UserScriptConnectArgs>(),
        onUserScriptMessage: createBrowserEvent<UserScriptMessageArgs>(),
    };

    interface MessageChannel {
        close(): void;
    }

    const messageChannels = new Set<MessageChannel>();

    const messageChannelClosedError = (): Error =>
        new Error('Browser method "runtime.sendMessage" message channel closed before a response was received.');

    const closeMessageChannels = (): void => {
        for (const channel of [...messageChannels]) channel.close();
    };

    const dispatchMessage = (message: unknown): Promise<unknown> =>
        new Promise((resolve, reject) => {
            let dispatchFinished = false;
            let heldOpen = false;
            let pendingResponses = 0;
            let settled = false;
            const errors: unknown[] = [];

            const channel: MessageChannel = {
                close(): void {
                    rejectFirst(messageChannelClosedError());
                },
            };

            const settle = (callback: () => void): void => {
                if (settled) return;

                settled = true;
                messageChannels.delete(channel);
                callback();
            };

            const resolveFirst = (response: unknown): void => {
                settle(() => resolve(response));
            };

            const rejectFirst = (error: unknown): void => {
                settle(() => reject(error));
            };

            const finishWithoutResponse = (): void => {
                if (settled || !dispatchFinished || pendingResponses > 0 || heldOpen) return;

                if (errors.length === 1) {
                    rejectFirst(errors[0]);
                } else if (errors.length > 1) {
                    rejectFirst(new AggregateError(errors, "Multiple runtime.onMessage listeners failed"));
                } else {
                    resolveFirst(undefined);
                }
            };

            const sendResponse = (response?: unknown): void => {
                resolveFirst(response);
            };

            const sender = cloneRecord(messageSender);
            const registrations = events.onMessage.registrations();
            messageChannels.add(channel);

            for (const {listener} of registrations) {
                let listenerResult: unknown;

                try {
                    listenerResult = listener(message, sender, sendResponse);
                } catch (error) {
                    errors.push(error);
                    continue;
                }

                if (listenerResult === true) {
                    heldOpen = true;
                    continue;
                }

                let then: unknown;

                try {
                    then =
                        listenerResult !== null &&
                        (typeof listenerResult === "object" || typeof listenerResult === "function")
                            ? Reflect.get(listenerResult, "then")
                            : undefined;
                } catch (error) {
                    errors.push(error);
                    continue;
                }

                if (typeof then === "function") {
                    pendingResponses += 1;

                    Promise.resolve(listenerResult).then(
                        response => {
                            resolveFirst(response);
                            pendingResponses -= 1;
                            finishWithoutResponse();
                        },
                        error => {
                            errors.push(error);
                            pendingResponses -= 1;
                            finishWithoutResponse();
                        }
                    );
                }

                // WebExtension message listeners answer through sendResponse or a
                // Promise/thenable. Synchronous return values other than literal
                // true do not become message responses.
            }

            dispatchFinished = true;
            finishWithoutResponse();
        });

    const isMessageOptions = (value: unknown): boolean => {
        if (value === undefined) return true;

        if (!value || typeof value !== "object" || Array.isArray(value)) return false;

        return Object.keys(value).every(key => key === "includeTlsChannelId");
    };

    const messageFromSendArguments = (args: readonly unknown[]): unknown => {
        if (args.length < 2) return args[0];

        if (args.length === 2 && isMessageOptions(args[1])) return args[0];

        return args[1];
    };

    const sendRuntimeMessage = ((...rawArgs: unknown[]): Promise<unknown> | undefined => {
        const possibleCallback = rawArgs.at(-1);
        const callback = typeof possibleCallback === "function" ? possibleCallback : undefined;
        const args = callback ? rawArgs.slice(0, -1) : rawArgs;
        const response = dispatchMessage(messageFromSendArguments(args));

        if (!callback) return response;

        void response.then(
            value => {
                callback(value);
            },
            error => {
                lastError.runWithLastError(error, () => callback());
            }
        );

        return undefined;
    }) as unknown as typeof chrome.runtime.sendMessage;

    const connect = createBrowserMethod<typeof chrome.runtime.connect, chrome.runtime.Port>({
        invocation: "sync",
        name: "runtime.connect",
        nextSequence,
    });

    const connectNative = createBrowserMethod<typeof chrome.runtime.connectNative, chrome.runtime.Port>({
        invocation: "sync",
        name: "runtime.connectNative",
        nextSequence,
    });

    const getContexts = createBrowserMethod<typeof chrome.runtime.getContexts, chrome.runtime.ExtensionContext[]>({
        callback: "last",
        implementation: ((
            filter: chrome.runtime.ContextFilter,
            callback?: (value: chrome.runtime.ExtensionContext[]) => void
        ) => {
            const result = contexts
                .filter(context => matchesContextFilter(context, filter))
                .map(context => cloneRecord(context));

            callback?.(result);

            return result;
        }) as unknown as typeof chrome.runtime.getContexts,
        invocation: "dual",
        lastError,
        name: "runtime.getContexts",
        nextSequence,
    });

    const getManifest = createBrowserMethod<typeof chrome.runtime.getManifest, chrome.runtime.Manifest>({
        implementation: (() => cloneRecord(manifest)) as typeof chrome.runtime.getManifest,
        invocation: "sync",
        name: "runtime.getManifest",
        nextSequence,
    });

    const getPackageDirectoryEntry = createBrowserMethod<
        typeof chrome.runtime.getPackageDirectoryEntry,
        FileSystemDirectoryEntry
    >({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "runtime.getPackageDirectoryEntry",
        nextSequence,
    });

    const getPlatformInfo = createBrowserMethod<typeof chrome.runtime.getPlatformInfo, chrome.runtime.PlatformInfo>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "runtime.getPlatformInfo",
        nextSequence,
    });

    const getBrowserInfo = createBrowserMethod<typeof browser.runtime.getBrowserInfo, browser.runtime.BrowserInfo>({
        implementation: (() =>
            Promise.resolve({
                buildID: "test-build-id",
                name: "Firefox",
                vendor: "Mozilla",
                version: "126.0",
            })) as typeof browser.runtime.getBrowserInfo,
        invocation: "promise",
        name: "runtime.getBrowserInfo",
        nextSequence,
    });

    const getURL = createBrowserMethod<typeof chrome.runtime.getURL, string>({
        implementation: ((path: string) => {
            const normalized = path.replace(/^\/+/, "");

            return `${urlScheme}://${extensionId}/${normalized}`;
        }) as typeof chrome.runtime.getURL,
        invocation: "sync",
        name: "runtime.getURL",
        nextSequence,
    });

    const openOptionsPage = createBrowserMethod<typeof chrome.runtime.openOptionsPage, void>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "runtime.openOptionsPage",
        nextSequence,
    });

    const reload = createBrowserMethod<typeof chrome.runtime.reload, void>({
        invocation: "sync",
        name: "runtime.reload",
        nextSequence,
    });

    const requestUpdateCheck = createBrowserMethod<typeof chrome.runtime.requestUpdateCheck, RequestUpdateCheckResult>({
        callback: "last",
        callbackArgs: result => [result.status, result.details],
        invocation: "dual",
        lastError,
        name: "runtime.requestUpdateCheck",
        nextSequence,
    });

    const restart = createBrowserMethod<typeof chrome.runtime.restart, void>({
        invocation: "sync",
        name: "runtime.restart",
        nextSequence,
    });

    const restartAfterDelay = createBrowserMethod<typeof chrome.runtime.restartAfterDelay, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "runtime.restartAfterDelay",
        nextSequence,
    });

    const sendMessage = createBrowserMethod<typeof chrome.runtime.sendMessage, unknown>({
        callback: "last",
        implementation: sendRuntimeMessage,
        invocation: "dual",
        lastError,
        name: "runtime.sendMessage",
        nextSequence,
    });

    const setUninstallURL = createBrowserMethod<typeof chrome.runtime.setUninstallURL, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "runtime.setUninstallURL",
        nextSequence,
    });

    const commonApi = {
        connect: connect.api,
        connectNative: connectNative.api,
        getContexts: getContexts.api,
        getManifest: getManifest.api,
        getPackageDirectoryEntry: getPackageDirectoryEntry.api,
        getPlatformInfo: getPlatformInfo.api,
        getURL: getURL.api,
        onConnect: eventApi(events.onConnect),
        onConnectExternal: eventApi(events.onConnectExternal),
        onInstalled: eventApi(events.onInstalled),
        onMessage: eventApi(events.onMessage),
        onMessageExternal: eventApi(events.onMessageExternal),
        onRestartRequired: eventApi(events.onRestartRequired),
        onStartup: eventApi(events.onStartup),
        onSuspend: eventApi(events.onSuspend),
        onSuspendCanceled: eventApi(events.onSuspendCanceled),
        onUpdateAvailable: eventApi(events.onUpdateAvailable),
        onUserScriptConnect: eventApi(events.onUserScriptConnect),
        onUserScriptMessage: eventApi(events.onUserScriptMessage),
        openOptionsPage: openOptionsPage.api,
        reload: reload.api,
        requestUpdateCheck: requestUpdateCheck.api,
        restart: restart.api,
        restartAfterDelay: restartAfterDelay.api,
        sendMessage: sendMessage.api,
        setUninstallURL: setUninstallURL.api,
    };

    const chromeApi = commonApi as unknown as RuntimeTestApi;
    const browserApi = {...commonApi, getBrowserInfo: getBrowserInfo.api} as unknown as RuntimeTestApi;

    for (const api of [chromeApi, browserApi]) {
        Reflect.defineProperty(api, "id", {configurable: true, enumerable: true, get: () => extensionId});
        Reflect.defineProperty(api, "lastError", {configurable: true, enumerable: true, get: () => lastError.current});
    }

    const methods = [
        connect,
        connectNative,
        getContexts,
        getManifest,
        getPackageDirectoryEntry,
        getPlatformInfo,
        getBrowserInfo,
        getURL,
        openOptionsPage,
        reload,
        requestUpdateCheck,
        restart,
        restartAfterDelay,
        sendMessage,
        setUninstallURL,
    ];

    return {
        chromeApi,
        browserApi,
        connect,
        connectNative,
        getContexts,
        getManifest,
        getPackageDirectoryEntry,
        getPlatformInfo,
        getBrowserInfo,
        getURL,
        openOptionsPage,
        reload,
        requestUpdateCheck,
        restart,
        restartAfterDelay,
        sendMessage,
        setUninstallURL,
        events,
        closeMessageChannels,
        get contexts() {
            return contexts.map(context => cloneRecord(context));
        },
        get id() {
            return extensionId;
        },
        get manifest() {
            return cloneRecord(manifest);
        },
        get lastError() {
            return lastError.current;
        },
        get messageSender() {
            return cloneRecord(messageSender);
        },
        addContext(context): void {
            contexts.push(cloneRecord(context));
        },
        emitMessage(message): Promise<unknown> {
            return dispatchMessage(message);
        },
        removeContext(contextId): void {
            contexts = contexts.filter(context => context.contextId !== contextId);
        },
        reset(): void {
            closeMessageChannels();
            extensionId = initialId;
            urlScheme = "chrome-extension";
            manifest = cloneRecord(initialManifest);
            contexts = initialContexts.map(context => cloneRecord(context));
            messageSender = cloneRecord(initialSender);

            methods.forEach(method => {
                method.reset();
            });

            Object.values(events).forEach(event => {
                event.reset();
            });
        },
        setContexts(value): void {
            contexts = value.map(context => cloneRecord(context));
        },
        setExtensionId(value): void {
            extensionId = value;
        },
        setManifest(value): void {
            manifest = cloneRecord(value);
        },
        setMessageSender(value): void {
            messageSender = cloneRecord(value);
        },
        setUrlScheme(value): void {
            urlScheme = value;
        },
    };
};
