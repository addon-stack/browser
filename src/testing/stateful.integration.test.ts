import {
    containsPermissions,
    getAllPermissions,
    onPermissionsAdded,
    onPermissionsRemoved,
    removePermissions,
    requestPermissions,
} from "../permissions";
import {
    getId,
    getManifest,
    getUrl,
    onInstalled,
    onMessage,
    onStartup,
    sendMessage as sendRuntimeMessage,
} from "../runtime";
import {
    executeScript,
    getRegisteredContentScripts,
    registerContentScripts,
    unregisterContentScripts,
    updateContentScripts,
} from "../scripting";
import {createTab, queryTabs, updateTab} from "../tabs";
import {createWindow, getAllWindows, removeWindow} from "../windows";
import {
    createBrowserHarness,
    createInjectionResultFixture,
    createInstalledDetailsFixture,
    createManifestFixture,
    createMessageSenderFixture,
    createPermissionsFixture,
    createTabFixture,
    createWindowFixture,
    installGlobals,
} from "./index";

const restorers: Array<() => void> = [];

const installChromeHarness = (harness: ReturnType<typeof createBrowserHarness>): void => {
    restorers.push(installGlobals({browser: undefined, chrome: harness.chrome}));
};

afterEach(() => {
    while (restorers.length > 0) restorers.pop()?.();
});

describe("stateful browser test harness", () => {
    test("emits runtime lifecycle/messages and configures sendMessage results and errors", async () => {
        const harness = createBrowserHarness();
        installChromeHarness(harness);
        const installed: chrome.runtime.InstalledDetails[] = [];
        let startupCount = 0;
        const messages: Array<{message: unknown; sender: chrome.runtime.MessageSender}> = [];
        const unsubscribeInstalled = onInstalled(details => installed.push(details));
        const unsubscribeStartup = onStartup(() => {
            startupCount += 1;
        });
        const unsubscribeMessage = onMessage((message, sender) => {
            messages.push({message, sender});
        });
        const sender = createMessageSenderFixture({id: "sender-extension-id", tab: createTabFixture({id: 31})});
        harness.runtime.setMessageSender(sender);

        await harness.runtime.events.onInstalled.emit(createInstalledDetailsFixture({reason: "update"}));
        await harness.runtime.events.onStartup.emit();
        await harness.runtime.emitMessage({kind: "ping"});

        expect(installed).toEqual([expect.objectContaining({reason: "update"})]);
        expect(startupCount).toBe(1);
        expect(messages).toEqual([{message: {kind: "ping"}, sender}]);

        harness.runtime.sendMessage.setResult({kind: "pong"});
        await expect(sendRuntimeMessage({kind: "ping"})).resolves.toEqual({kind: "pong"});
        const failure = new Error("message delivery failed");
        harness.runtime.sendMessage.failNext(failure);
        await expect(sendRuntimeMessage({kind: "retry"})).rejects.toThrow("message delivery failed");
        expect(harness.chrome.runtime.lastError).toBeUndefined();

        unsubscribeInstalled();
        unsubscribeStartup();
        unsubscribeMessage();
        expect(harness.runtime.events.onInstalled.listenerCount()).toBe(0);
        expect(harness.runtime.events.onStartup.listenerCount()).toBe(0);
        expect(harness.runtime.events.onMessage.listenerCount()).toBe(0);
    });

    test("runs the real runtime and permissions wrappers against isolated mutable state", async () => {
        const harness = createBrowserHarness({
            extensionId: "runtime-test-id",
            manifest: createManifestFixture({name: "Runtime Test"}),
            permissions: createPermissionsFixture({permissions: ["storage"]}),
        });
        installChromeHarness(harness);

        expect(getId()).toBe("runtime-test-id");
        expect(getManifest()).toMatchObject({manifest_version: 3, name: "Runtime Test"});
        expect(getUrl("/options.html")).toBe("chrome-extension://runtime-test-id/options.html");

        const added: chrome.permissions.Permissions[] = [];
        const removed: chrome.permissions.Permissions[] = [];
        const unsubscribeAdded = onPermissionsAdded(value => added.push(value));
        const unsubscribeRemoved = onPermissionsRemoved(value => removed.push(value));

        await expect(requestPermissions({origins: ["https://example.test/*"], permissions: ["tabs"]})).resolves.toBe(
            true
        );
        await expect(
            containsPermissions({origins: ["https://example.test/*"], permissions: ["storage", "tabs"]})
        ).resolves.toBe(true);
        await expect(removePermissions({permissions: ["tabs"]})).resolves.toBe(true);

        expect(await getAllPermissions()).toEqual({
            origins: ["https://example.test/*"],
            permissions: ["storage"],
        });
        expect(added).toEqual([{origins: ["https://example.test/*"], permissions: ["tabs"]}]);
        expect(removed).toEqual([{origins: [], permissions: ["tabs"]}]);

        unsubscribeAdded();
        unsubscribeRemoved();
        expect(harness.permissions.onAdded.listenerCount()).toBe(0);
        expect(harness.permissions.onRemoved.listenerCount()).toBe(0);
    });

    test("keeps tabs and windows in one state and rejects unsupported query filters", async () => {
        const harness = createBrowserHarness({
            tabs: [
                createTabFixture({
                    active: true,
                    id: 11,
                    title: "Initial",
                    url: "https://initial.example/page",
                    windowId: 7,
                }),
            ],
            windows: [createWindowFixture({focused: true, id: 7})],
        });
        installChromeHarness(harness);

        const createdWindow = await createWindow({
            focused: true,
            url: ["https://one.example/page", "https://two.example/page"],
        });
        expect(createdWindow?.tabs).toHaveLength(2);

        const windows = await getAllWindows({populate: true});
        const populated = windows.find(window => window.id === createdWindow?.id);
        expect(populated?.tabs?.map(tab => tab.url)).toEqual(["https://one.example/page", "https://two.example/page"]);

        const createdTab = await createTab({
            active: true,
            url: "https://literal.example/path",
            windowId: createdWindow?.id,
        });
        await expect(queryTabs({active: true, currentWindow: true})).resolves.toEqual([
            expect.objectContaining({id: createdTab.id, url: "https://literal.example/path"}),
        ]);
        await expect(queryTabs({url: "https://literal.example/path"})).resolves.toHaveLength(1);
        await expect(queryTabs({url: "https://literal.example/*"})).resolves.toHaveLength(1);
        await expect(queryTabs({id: createdTab.id} as chrome.tabs.QueryInfo)).rejects.toThrow(
            'tabs.query filter "id" is not supported'
        );

        await expect(updateTab(createdTab.id as number, {pinned: true})).resolves.toMatchObject({pinned: true});
        expect(harness.tabs.values.find(tab => tab.id === createdTab.id)).toMatchObject({pinned: true});

        await removeWindow(createdWindow?.id as number);
        expect(harness.windows.values.some(window => window.id === createdWindow?.id)).toBe(false);
        expect(harness.tabs.values.some(tab => tab.windowId === createdWindow?.id)).toBe(false);
    });

    test("combines configurable scripting results with a stateful content-script registry", async () => {
        const harness = createBrowserHarness({
            registeredContentScripts: [{id: "initial", js: ["initial.js"], matches: ["https://initial.example/*"]}],
        });
        installChromeHarness(harness);

        harness.scripting.executeScript.setResult([createInjectionResultFixture({frameId: 3, result: "executed"})]);
        await expect(executeScript({func: () => "production function", target: {tabId: 1}})).resolves.toEqual([
            expect.objectContaining({frameId: 3, result: "executed"}),
        ]);

        await registerContentScripts([{id: "added", js: ["added.js"], matches: ["https://added.example/*"]}]);
        await updateContentScripts([{id: "added", js: ["updated.js"]}]);
        await expect(getRegisteredContentScripts({ids: ["added"]})).resolves.toEqual([
            expect.objectContaining({id: "added", js: ["updated.js"], matches: ["https://added.example/*"]}),
        ]);

        await unregisterContentScripts({ids: ["added"]});
        await expect(getRegisteredContentScripts()).resolves.toEqual([
            expect.objectContaining({id: "initial", js: ["initial.js"]}),
        ]);

        expect(harness.calls.map(call => call.api)).toEqual([
            "scripting.executeScript",
            "scripting.registerContentScripts",
            "scripting.updateContentScripts",
            "scripting.getRegisteredContentScripts",
            "scripting.unregisterContentScripts",
            "scripting.getRegisteredContentScripts",
        ]);
    });

    test("exposes runtime.lastError only inside callbacks and rejects Promise failures", async () => {
        const harness = createBrowserHarness({
            tabs: [createTabFixture({id: 1, url: "https://callback.example/", windowId: 1})],
            windows: [createWindowFixture({id: 1})],
        });
        let callbackLastError: chrome.runtime.LastError | undefined;

        const callbackResult = await new Promise<chrome.tabs.Tab[]>(resolve => {
            harness.chrome.tabs.query({active: true}, resolve);
        });
        expect(callbackResult).toEqual([expect.objectContaining({id: 1})]);
        await expect(harness.browser.tabs.query({active: true})).resolves.toEqual([expect.objectContaining({id: 1})]);

        await new Promise<void>(resolve => {
            harness.chrome.tabs.get(404, () => {
                callbackLastError = harness.chrome.runtime.lastError;
                resolve();
            });
        });

        expect(callbackLastError?.message).toBe("No tab with id: 404.");
        expect(harness.chrome.runtime.lastError).toBeUndefined();
        await expect(harness.browser.tabs.get(404)).rejects.toThrow("No tab with id: 404.");
        expect(harness.browser.runtime.lastError).toBeUndefined();
    });

    test("reset restores initial state and two harnesses never share state", async () => {
        const first = createBrowserHarness({
            extensionId: "first-id",
            permissions: {permissions: ["storage"]},
            tabs: [createTabFixture({id: 1, windowId: 1})],
            windows: [createWindowFixture({id: 1})],
        });
        const second = createBrowserHarness({extensionId: "second-id"});

        await first.permissions.grant({permissions: ["tabs"]});
        await first.tabs.create.api({url: "https://first.example/"});

        expect(first.runtime.id).toBe("first-id");
        expect(second.runtime.id).toBe("second-id");
        expect(first.permissions.value.permissions).toEqual(["storage", "tabs"]);
        expect(second.permissions.value.permissions).toEqual([]);
        expect(first.tabs.values).toHaveLength(2);
        expect(second.tabs.values).toHaveLength(0);

        first.reset();

        expect(first.permissions.value.permissions).toEqual(["storage"]);
        expect(first.tabs.values).toHaveLength(1);
        expect(first.calls).toEqual([]);
        expect(second.permissions.value.permissions).toEqual([]);
    });

    test("keeps explicit window fixtures and their nested tabs synchronized", () => {
        const harness = createBrowserHarness({
            windows: [
                createWindowFixture({
                    id: 5,
                    tabs: [createTabFixture({id: 51, windowId: 999})],
                }),
            ],
        });

        expect(harness.tabs.values).toEqual([expect.objectContaining({id: 51, windowId: 5})]);
        expect(harness.windows.values[0]?.tabs).toEqual([expect.objectContaining({id: 51, windowId: 5})]);

        harness.windows.set([createWindowFixture({id: 8, tabs: [createTabFixture({id: 81, windowId: 5})]})]);

        expect(harness.tabs.values).toEqual([expect.objectContaining({id: 81, windowId: 8})]);
        expect(harness.windows.values).toEqual([
            expect.objectContaining({id: 8, tabs: [expect.objectContaining({id: 81, windowId: 8})]}),
        ]);
    });
});
