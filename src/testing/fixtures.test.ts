import {
    createExtensionContextFixture,
    createInjectionResultFixture,
    createInstalledDetailsFixture,
    createManifestFixture,
    createMessageSenderFixture,
    createPermissionsFixture,
    createTabFixture,
    createWindowFixture,
} from "./fixtures";

describe("testing fixtures", () => {
    test("creates deterministic manifests and clones nested overrides", () => {
        const permissions: chrome.runtime.ManifestPermission[] = ["tabs"];
        const first = createManifestFixture({name: "Overridden", permissions});
        const second = createManifestFixture({name: "Overridden", permissions});

        expect(first).toMatchObject({manifest_version: 3, name: "Overridden", version: "1.0.0"});
        expect(first).not.toBe(second);
        expect(first.permissions).not.toBe(permissions);
        expect(first.permissions).not.toBe(second.permissions);
    });

    test("creates a valid fresh tab with cloned nested state", () => {
        const mutedInfo: chrome.tabs.MutedInfo = {muted: true, reason: "user"};
        const first = createTabFixture({id: 7, active: false, mutedInfo});
        const second = createTabFixture({id: 7, active: false, mutedInfo});

        expect(first).toMatchObject({
            id: 7,
            index: 0,
            windowId: 1,
            active: false,
            highlighted: true,
            pinned: false,
            frozen: false,
            discarded: false,
            groupId: -1,
        });
        expect(first).not.toBe(second);
        expect(first.mutedInfo).not.toBe(mutedInfo);
        expect(first.mutedInfo).not.toBe(second.mutedInfo);
    });

    test("creates a fresh window and clones tabs", () => {
        const tab = createTabFixture();
        const first = createWindowFixture({id: 3, tabs: [tab]});
        const second = createWindowFixture({id: 3, tabs: [tab]});

        expect(first).toMatchObject({id: 3, focused: true, alwaysOnTop: false, incognito: false});
        expect(first.tabs).not.toBe(second.tabs);
        expect(first.tabs?.[0]).not.toBe(tab);
        expect(first.tabs?.[0]).not.toBe(second.tabs?.[0]);
    });

    test("creates fresh permission arrays", () => {
        const permissions = ["tabs"] as chrome.runtime.ManifestPermission[];
        const origins = ["https://example.com/*"];
        const first = createPermissionsFixture({permissions, origins});
        const second = createPermissionsFixture({permissions, origins});

        expect(first).toEqual({permissions, origins});
        expect(first.permissions).not.toBe(permissions);
        expect(first.permissions).not.toBe(second.permissions);
        expect(first.origins).not.toBe(origins);
        expect(first.origins).not.toBe(second.origins);
    });

    test("creates installed details with an install reason", () => {
        expect(createInstalledDetailsFixture()).toEqual({reason: "install"});
        expect(createInstalledDetailsFixture({reason: "update", previousVersion: "0.9.0"})).toEqual({
            reason: "update",
            previousVersion: "0.9.0",
        });
    });

    test("creates message senders and clones overridden tabs", () => {
        const tab = createTabFixture();
        const sender = createMessageSenderFixture({tab});

        expect(sender).toMatchObject({
            id: "test-extension-id",
            origin: "chrome-extension://test-extension-id",
            url: "chrome-extension://test-extension-id/background.html",
        });
        expect(sender.tab).not.toBe(tab);
    });

    test("creates deterministic extension contexts", () => {
        const context = createExtensionContextFixture({contextType: "OFFSCREEN_DOCUMENT", documentId: "document-2"});

        expect(context).toEqual({
            contextId: "test-context-id",
            contextType: "OFFSCREEN_DOCUMENT",
            documentId: "document-2",
            frameId: -1,
            incognito: false,
            tabId: -1,
            windowId: -1,
        });
    });

    test("creates typed generic injection results and clones result objects", () => {
        const result = {value: 15, items: ["first"]};
        const injection = createInjectionResultFixture({frameId: 2, result});
        const typed: chrome.scripting.InjectionResult<{value: number; items: string[]}> = injection;

        expect(typed).toEqual({documentId: "test-document-id", frameId: 2, result});
        expect(typed.result).not.toBe(result);
        expect(typed.result?.items).not.toBe(result.items);
    });
});
