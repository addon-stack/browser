import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {
    type BrowserHarness,
    createBrowserEvent,
    createBrowserHarness,
    createExtensionContextFixture,
    createManifestFixture,
    installBrowserGlobals,
} from "../../testing";
import {
    connect,
    connectNative,
    getBrowserInfo,
    getContexts,
    getId,
    getManifest,
    getManifestVersion,
    getPackageDirectoryEntry,
    getPlatformInfo,
    getUrl,
    isManifestVersion3,
    openOptionsPage,
    reload,
    requestUpdateCheck,
    restart,
    restartAfterDelay,
    sendMessage,
    setUninstallUrl,
} from "./methods";

const port: chrome.runtime.Port = {
    name: "channel",
    disconnect: jest.fn(),
    postMessage: jest.fn(),
    onDisconnect: createBrowserEvent<[chrome.runtime.Port]>().api as chrome.runtime.Port["onDisconnect"],
    onMessage: createBrowserEvent<[unknown, chrome.runtime.Port]>().api as chrome.runtime.Port["onMessage"],
};

describe.each(["chrome", "firefox"] as const)("runtime methods in %s", profile => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restoreGlobals = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => {
        restoreGlobals();
    });

    test.each([undefined, {name: "channel", includeTlsChannelId: true}])("connect forwards connection details %p and returns the native port synchronously", info => {
        harness.runtime.connect.setResult(port);
        expect(connect("other-extension", info)).toBe(port);

        expect(harness.runtime.connect.calls).toMatchObject([
            {args: ["other-extension", info], callback: undefined, invocation: "sync"},
        ]);
    });

    test("connectNative forwards the application and returns the native port synchronously", () => {
        harness.runtime.connectNative.setResult(port);
        expect(connectNative("org.example.host")).toBe(port);

        expect(harness.runtime.connectNative.calls).toMatchObject([
            {args: ["org.example.host"], callback: undefined, invocation: "sync"},
        ]);
    });

    test.each([
        {label: "matching contexts", contexts: [createExtensionContextFixture()]},
        {label: "an empty list", contexts: []},
    ])("getContexts forwards its filter and preserves $label", async ({contexts}) => {
        const filter: chrome.runtime.ContextFilter = {contextTypes: ["BACKGROUND"]};
        harness.runtime.getContexts.setResult(contexts);
        await expect(getContexts(filter)).resolves.toBe(contexts);
        expect(harness.runtime.getContexts.calls[0].args).toEqual([filter]);
        expect(harness.runtime.getContexts.calls[0].args[0]).toBe(filter);
    });

    test("getManifest preserves the native manifest", () => {
        const manifest = createManifestFixture({name: "Runtime test", version: "2.0"});
        harness.runtime.getManifest.setResult(manifest);
        expect(getManifest()).toBe(manifest);
        expect(harness.runtime.getManifest.calls[0]).toMatchObject({args: [], invocation: "sync"});
    });

    test("getPackageDirectoryEntry preserves the native directory object", async () => {
        const entry = {name: "root", fullPath: "/", isDirectory: true, isFile: false} as FileSystemDirectoryEntry;
        harness.runtime.getPackageDirectoryEntry.setResult(entry);
        await expect(getPackageDirectoryEntry()).resolves.toBe(entry);
        expect(harness.runtime.getPackageDirectoryEntry.calls[0].args).toEqual([]);
    });

    test("getPlatformInfo preserves the native result", async () => {
        const info: chrome.runtime.PlatformInfo = {os: "linux", arch: "x86-64", nacl_arch: "x86-64"};
        harness.runtime.getPlatformInfo.setResult(info);
        await expect(getPlatformInfo()).resolves.toBe(info);
        expect(harness.runtime.getPlatformInfo.calls[0].args).toEqual([]);
    });

    test("getBrowserInfo retains its Firefox-only Promise behavior", async () => {
        if (profile === "chrome") {
            expect(() => getBrowserInfo()).toThrow(TypeError);
            expect(harness.runtime.getBrowserInfo.calls).toHaveLength(0);

            return;
        }

        const info = {name: "Firefox", vendor: "Mozilla", version: "126.0", buildID: "test"};
        harness.runtime.getBrowserInfo.setResult(info);
        await expect(getBrowserInfo()).resolves.toBe(info);
        expect(harness.runtime.getBrowserInfo.calls[0]).toMatchObject({args: [], callback: undefined, invocation: "promise"});
        harness.runtime.getBrowserInfo.failNext(new Error("Browser info unavailable"));
        await expect(getBrowserInfo()).rejects.toThrow("Browser info unavailable");
    });

    test("getUrl forwards the original path and preserves the native URL", () => {
        harness.runtime.getURL.setResult("extension://id/options.html");
        expect(getUrl("/options.html")).toBe("extension://id/options.html");
        expect(harness.runtime.getURL.calls[0]).toMatchObject({args: ["/options.html"], invocation: "sync"});
    });

    test.each([
        ["openOptionsPage", () => openOptionsPage(), []],
        ["restartAfterDelay", () => restartAfterDelay(30), [30]],
        ["setUninstallURL", () => setUninstallUrl("https://example.test/uninstalled"), ["https://example.test/uninstalled"]],
    ] as const)("%s forwards arguments and resolves without a result", async (name, invoke, args) => {
        harness.runtime[name].setResult(undefined);
        await expect(invoke()).resolves.toBeUndefined();
        expect(harness.runtime[name].calls).toHaveLength(1);
        expect(harness.runtime[name].calls[0].args).toEqual(args);
    });

    test.each([
        ["reload", reload],
        ["restart", restart],
    ] as const)("%s stays synchronous", (name, invoke) => {
        harness.runtime[name].setResult(undefined);
        expect(invoke()).toBeUndefined();
        expect(harness.runtime[name].calls).toMatchObject([{args: [], callback: undefined, invocation: "sync"}]);
    });

    test.each([
        {status: "update_available", details: {version: "2.0"}},
        {status: "no_update", details: undefined},
        {status: "throttled", details: undefined},
    ] as const)("requestUpdateCheck preserves status $status and optional details", async result => {
        harness.runtime.requestUpdateCheck.setResult(result);
        const actual = await requestUpdateCheck();
        expect(actual).toEqual(result);
        expect(actual.details).toBe(result.details);

        expect(harness.runtime.requestUpdateCheck.calls[0]).toMatchObject({
            args: [], callbackCalls: [[result.status, result.details]],
        });
    });

    test.each([{kind: "pong"}, undefined, false])("sendMessage preserves response %p and forwards the original message", async response => {
        const message = {kind: "ping"};
        harness.runtime.sendMessage.setResult(response);
        await expect(sendMessage<typeof message, typeof response>(message)).resolves.toBe(response);
        expect(harness.runtime.sendMessage.calls[0].args).toEqual([message]);
        expect(harness.runtime.sendMessage.calls[0].args[0]).toBe(message);
    });

    test("getId reads the current extension id", () => {
        harness.runtime.setExtensionId("first-id");
        expect(getId()).toBe("first-id");
        harness.runtime.setExtensionId("second-id");
        expect(getId()).toBe("second-id");
    });

    test.each([2, 3] as const)("manifest helpers reflect manifest version %s", version => {
        harness.runtime.setManifest(createManifestFixture({manifest_version: version}));
        expect(getManifestVersion()).toBe(version);
        expect(isManifestVersion3()).toBe(version === 3);
    });

    test.each([
        ["getContexts", () => getContexts({})],
        ["getPackageDirectoryEntry", () => getPackageDirectoryEntry()],
        ["getPlatformInfo", () => getPlatformInfo()],
        ["openOptionsPage", () => openOptionsPage()],
        ["requestUpdateCheck", () => requestUpdateCheck()],
        ["restartAfterDelay", () => restartAfterDelay(30)],
        ["sendMessage", () => sendMessage({kind: "ping"})],
        ["setUninstallURL", () => setUninstallUrl("")],
    ] as const)("%s rejects native failures", async (name, invoke) => {
        harness.runtime[name].failNext(new Error("Runtime operation failed"));
        await expect(invoke()).rejects.toThrow("Runtime operation failed");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test.each([
        ["connect", () => connect("other-extension")],
        ["connectNative", () => connectNative("org.example.host")],
        ["getManifest", () => getManifest()],
        ["getManifest", () => getManifestVersion()],
        ["getManifest", () => isManifestVersion3()],
        ["getURL", () => getUrl("options.html")],
        ["reload", reload],
        ["restart", restart],
    ] as const)("%s propagates synchronous failures", (name, invoke) => {
        harness.runtime[name].failNext(new Error("Synchronous runtime failure"));
        expect(invoke).toThrow("Synchronous runtime failure");
    });
});
