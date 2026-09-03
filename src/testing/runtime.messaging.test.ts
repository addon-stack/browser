import {onMessage, sendMessage} from "../runtime";
import {createBrowserHarness, createMessageSenderFixture, createTabFixture, installGlobals} from "./index";

const restorers: Array<() => void> = [];

const CHANNEL_CLOSED_MESSAGE =
    'Browser method "runtime.sendMessage" message channel closed before a response was received.';

const installChromeHarness = (harness: ReturnType<typeof createBrowserHarness>): void => {
    restorers.push(installGlobals({browser: undefined, chrome: harness.chrome}));
};

afterEach(() => {
    while (restorers.length > 0) restorers.pop()?.();
});

describe("stateful runtime messaging", () => {
    test("routes the real callback wrapper through onMessage with the configured sender", async () => {
        const harness = createBrowserHarness();
        const sender = createMessageSenderFixture({id: "sender-id", tab: createTabFixture({id: 42})});
        const received: Array<{message: unknown; sender: chrome.runtime.MessageSender}> = [];

        harness.runtime.setMessageSender(sender);
        installChromeHarness(harness);

        const unsubscribe = onMessage((message, actualSender, sendResponse) => {
            received.push({message, sender: actualSender});
            sendResponse({kind: "pong"});
        });

        await expect(sendMessage({kind: "ping"})).resolves.toEqual({kind: "pong"});
        expect(received).toEqual([{message: {kind: "ping"}, sender}]);

        expect(harness.runtime.sendMessage.calls[0]).toMatchObject({
            args: [{kind: "ping"}],
            invocation: "callback",
            callbackCalls: [[{kind: "pong"}]],
        });

        unsubscribe();
    });

    test("uses the first actual response while still starting every listener synchronously", async () => {
        const harness = createBrowserHarness();
        const calls: string[] = [];

        harness.runtime.events.onMessage.on((_message, _sender, sendResponse) => {
            calls.push("first");
            sendResponse("first response");
        });

        harness.runtime.events.onMessage.on((_message, _sender, sendResponse) => {
            calls.push("second");
            sendResponse("second response");
        });

        const response = harness.browser.runtime.sendMessage("ping");

        expect(calls).toEqual(["first", "second"]);
        await expect(response).resolves.toBe("first response");

        const asyncHarness = createBrowserHarness();
        let resolveSlow: (value: string) => void = () => undefined;

        asyncHarness.runtime.events.onMessage.on(() => {
            calls.push("slow started");

            return new Promise<string>(resolve => {
                resolveSlow = resolve;
            });
        });

        asyncHarness.runtime.events.onMessage.on(() => {
            calls.push("fast started");

            return Promise.resolve("fast response");
        });

        const asyncResponse = asyncHarness.browser.runtime.sendMessage("ping");

        expect(calls).toEqual(["first", "second", "slow started", "fast started"]);
        await expect(asyncResponse).resolves.toBe("fast response");
        resolveSlow("slow response");
        await Promise.resolve();
    });

    test("holds the response channel only when a listener returns true", async () => {
        const heldHarness = createBrowserHarness();

        heldHarness.runtime.events.onMessage.on((_message, _sender, sendResponse) => {
            queueMicrotask(() => sendResponse("async response"));

            return true;
        });

        await expect(heldHarness.browser.runtime.sendMessage("ping")).resolves.toBe("async response");

        const closedHarness = createBrowserHarness();

        closedHarness.runtime.events.onMessage.on((_message, _sender, sendResponse) => {
            queueMicrotask(() => sendResponse("too late"));
        });

        await expect(closedHarness.browser.runtime.sendMessage("ping")).resolves.toBeUndefined();
    });

    test("accepts Promise and arbitrary thenable responses", async () => {
        const promiseHarness = createBrowserHarness();
        promiseHarness.runtime.events.onMessage.on(() => Promise.resolve({source: "promise"}));

        await expect(promiseHarness.runtime.emitMessage("ping")).resolves.toEqual({source: "promise"});

        const thenableHarness = createBrowserHarness();

        thenableHarness.runtime.events.onMessage.on(() => ({
            // This intentionally models a non-Promise thenable.
            then(resolve: (value: unknown) => void) {
                resolve({source: "thenable"});
            },
        }));

        await expect(thenableHarness.browser.runtime.sendMessage("ping")).resolves.toEqual({source: "thenable"});
    });

    test("resolves undefined when no listener responds", async () => {
        const emptyHarness = createBrowserHarness();
        await expect(emptyHarness.browser.runtime.sendMessage("ping")).resolves.toBeUndefined();

        const silentHarness = createBrowserHarness();
        silentHarness.runtime.events.onMessage.on(() => "not a WebExtension response channel");
        await expect(silentHarness.runtime.emitMessage("ping")).resolves.toBeUndefined();
    });

    test("exposes dispatch failures through callback-scoped runtime.lastError", async () => {
        const harness = createBrowserHarness();
        const failure = new Error("listener failed");
        const observed: Array<{message: string | undefined; response: unknown}> = [];
        harness.runtime.events.onMessage.on(() => Promise.reject(failure));

        await new Promise<void>(resolve => {
            harness.chrome.runtime.sendMessage("ping", response => {
                observed.push({message: harness.chrome.runtime.lastError?.message, response});
                resolve();
            });
        });

        expect(observed).toEqual([{message: "listener failed", response: undefined}]);
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("explicitly closes every pending message channel and ignores late responses", async () => {
        const harness = createBrowserHarness();
        const lateResponses: Array<(response?: unknown) => void> = [];

        harness.runtime.events.onMessage.on((_message, _sender, sendResponse) => {
            lateResponses.push(sendResponse);

            return true;
        });

        const first = harness.browser.runtime.sendMessage("first");
        const second = harness.runtime.emitMessage("second");
        harness.runtime.closeMessageChannels();

        await expect(first).rejects.toThrow(CHANNEL_CLOSED_MESSAGE);
        await expect(second).rejects.toThrow(CHANNEL_CLOSED_MESSAGE);

        lateResponses.forEach(sendResponse => {
            sendResponse("too late");
        });

        harness.runtime.closeMessageChannels();
        await expect(first).rejects.toThrow(CHANNEL_CLOSED_MESSAGE);
        await expect(second).rejects.toThrow(CHANNEL_CLOSED_MESSAGE);
    });

    test("reports an explicitly closed callback channel through scoped runtime.lastError", async () => {
        const harness = createBrowserHarness();
        const observed: Array<{message: string | undefined; response: unknown}> = [];
        harness.runtime.events.onMessage.on(() => true);

        const callbackFinished = new Promise<void>(resolve => {
            harness.chrome.runtime.sendMessage("ping", response => {
                observed.push({message: harness.chrome.runtime.lastError?.message, response});
                resolve();
            });
        });

        harness.runtime.closeMessageChannels();
        await callbackFinished;

        expect(observed).toEqual([{message: CHANNEL_CLOSED_MESSAGE, response: undefined}]);
        expect(harness.chrome.runtime.lastError).toBeUndefined();
    });

    test("reset rejects pending channels but leaves already settled dispatches unchanged", async () => {
        const harness = createBrowserHarness();
        let holdOpen = false;

        harness.runtime.events.onMessage.on((_message, _sender, sendResponse) => {
            if (holdOpen) return true;

            sendResponse("settled response");
        });

        const settled = harness.browser.runtime.sendMessage("settled");
        await expect(settled).resolves.toBe("settled response");

        holdOpen = true;
        const pending = harness.browser.runtime.sendMessage("pending");
        harness.reset();

        await expect(pending).rejects.toThrow(CHANNEL_CLOSED_MESSAGE);
        await expect(settled).resolves.toBe("settled response");
        expect(harness.runtime.events.onMessage.listenerCount()).toBe(0);
        expect(() => harness.runtime.closeMessageChannels()).not.toThrow();
    });
});
