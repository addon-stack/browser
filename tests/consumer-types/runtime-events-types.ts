import {
    onConnect,
    onConnectExternal,
    onInstalled,
    onMessage,
    onMessageExternal,
    onRestartRequired,
    onStartup,
    onSuspend,
    onSuspendCanceled,
    onUpdateAvailable,
    onUserScriptConnect,
    onUserScriptMessage,
} from "@addon-core/browser";

const events = {
    onConnect,
    onConnectExternal,
    onInstalled,
    onMessage,
    onMessageExternal,
    onRestartRequired,
    onStartup,
    onSuspend,
    onSuspendCanceled,
    onUpdateAvailable,
    onUserScriptConnect,
    onUserScriptMessage,
};

type Expected = {
    [Name in keyof typeof events]: (callback: Parameters<(typeof chrome.runtime)[Name]["addListener"]>[0]) => () => void;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof events, Expected> = true;
void [events, signaturesUnchanged];

for (const subscribe of [onMessage, onMessageExternal, onUserScriptMessage]) {
    const unsubscribe: () => void = subscribe((message, sender, sendResponse) => {
        const nativeSender: chrome.runtime.MessageSender = sender;
        const respond: (response?: any) => void = sendResponse;
        respond({echo: message, tabId: nativeSender.tab?.id});

        return true;
    });

    subscribe(async (_message, sender) => ({id: sender.id}));
    unsubscribe();
    // @ts-expect-error Runtime message subscriptions take no registration filter.
    subscribe(() => undefined, {});
    // @ts-expect-error The second callback argument is a sender, not a tab.
    subscribe((_message, _sender: chrome.tabs.Tab) => undefined);
    // @ts-expect-error The third callback argument must be a response callback.
    subscribe((_message, _sender, _respond: string) => undefined);
}

onConnect(port => {
    const nativePort: chrome.runtime.Port = port;
    nativePort.postMessage({kind: "ping"});
});

onInstalled(details => {
    const reason: chrome.runtime.InstalledDetails["reason"] = details.reason;
    void reason;
});

// @ts-expect-error Startup listeners receive no arguments.
onStartup((_details: chrome.runtime.InstalledDetails) => undefined);
// @ts-expect-error Restart listeners receive a native reason string.
onRestartRequired((_details: {reason: string}) => undefined);
// @ts-expect-error Runtime connections do not take a filter.
onUserScriptConnect(() => undefined, {});
