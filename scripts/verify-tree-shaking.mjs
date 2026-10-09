import assert from "node:assert/strict";
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {build} from "tsup";
import availabilityApis from "../codegen/availability/apis.mjs";

const directory = await mkdtemp(join(tmpdir(), "browser-tree-shaking-"));
const packageEntry = fileURLToPath(new URL("../dist/index.js", import.meta.url)).replaceAll("\\", "/");

const consumers = [
    {exportName: "onActionClicked", eventName: "onClicked"},
    {exportName: "onActionUserSettingsChanged", eventName: "onUserSettingsChanged"},
    {exportName: "onAlarm", eventName: "onAlarm", namespace: "alarms"},
    {exportName: "onSpecificAlarm", eventName: "onAlarm", namespace: "alarms"},
    {exportName: "onSpecificAlarms", eventName: "onAlarm", namespace: "alarms"},
    {exportName: "onAudioLevelChanged", eventName: "onLevelChanged", namespace: "audio"},
    {exportName: "onCommand", eventName: "onCommand", namespace: "commands"},
    {exportName: "onSpecificCommand", eventName: "onCommand", namespace: "commands"},
    {exportName: "onSpecificCommands", eventName: "onCommand", namespace: "commands"},
    {exportName: "onContextMenusClicked", eventName: "onClicked", namespace: "contextMenus"},
    {exportName: "onCookieChanged", eventName: "onChanged", namespace: "cookies"},
    {exportName: "onDownloadsChanged", eventName: "onChanged", namespace: "downloads"},
    {exportName: "onDownloadsCreated", eventName: "onCreated", namespace: "downloads"},
    {exportName: "onDownloadsDeterminingFilename", eventName: "onDeterminingFilename", namespace: "downloads"},
    {exportName: "onHistoryVisited", eventName: "onVisited", namespace: "history"},
    {exportName: "onIdentitySignInChanged", eventName: "onSignInChanged", namespace: "identity"},
    {exportName: "onIdleStateChanged", eventName: "onStateChanged", namespace: "idle"},
    {exportName: "onExtensionInstalled", eventName: "onInstalled", namespace: "management"},
    {exportName: "onPermissionsAdded", eventName: "onAdded", namespace: "permissions"},
    {exportName: "onMessage", eventName: "onMessage", namespace: "runtime"},
    {exportName: "onMessageExternal", eventName: "onMessageExternal", namespace: "runtime"},
    {exportName: "onUserScriptMessage", eventName: "onUserScriptMessage", namespace: "runtime"},
    {exportName: "onCaptureStatusChanged", eventName: "onStatusChanged", namespace: "tabCapture"},
    {exportName: "onNotificationsClosed", eventName: "onClosed"},
    {exportName: "onTabUpdated", eventName: "onUpdated"},
    {exportName: "onWebRequestBeforeRequest", eventName: "onBeforeRequest"},
    {exportName: "onWindowCreated", eventName: "onCreated"},
    {exportName: "onWebNavigationCommitted", eventName: "onCommitted"},
];

const eventNames = [
    "onActivated", "onAttached", "onCreated", "onDetached", "onHighlighted", "onMoved", "onRemoved",
    "onReplaced", "onUpdated", "onZoomChange", "onAuthRequired", "onBeforeRedirect", "onBeforeRequest",
    "onBeforeSendHeaders", "onCompleted", "onErrorOccurred", "onHeadersReceived", "onResponseStarted",
    "onSendHeaders", "onMessage", "onBoundsChanged", "onFocusChanged", "onBeforeNavigate", "onCommitted",
    "onCreatedNavigationTarget", "onDOMContentLoaded", "onHistoryStateUpdated", "onReferenceFragmentUpdated",
    "onTabReplaced", "onClicked", "onUserSettingsChanged", "onButtonClicked", "onClosed", "onPermissionLevelChanged",
    "onDeviceListChanged", "onLevelChanged", "onMuteChanged", "onChanged", "onVisited", "onVisitRemoved",
    "onSignInChanged", "onStateChanged", "onDisabled", "onEnabled", "onInstalled", "onUninstalled", "onAdded", "onStatusChanged", "onCommand", "onAlarm",
    "onConnect", "onConnectExternal", "onMessageExternal", "onRestartRequired", "onStartup", "onSuspend",
    "onSuspendCanceled", "onUpdateAvailable", "onUserScriptConnect", "onUserScriptMessage", "onDeterminingFilename",
];

async function verifyDownloadsConsumer(path, eventName, source) {
    const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const originalBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
    const listeners = new Set();

    const event = {
        addListener: listener => listeners.add(listener),
        removeListener: listener => listeners.delete(listener),
    };

    try {
        Object.defineProperty(globalThis, "chrome", {configurable: true, value: {downloads: {[eventName]: event}}});
        Object.defineProperty(globalThis, "browser", {configurable: true, value: undefined});
        const url = pathToFileURL(path);
        url.searchParams.set("consumer", eventName);
        const {subscribe} = await import(url.href);
        const item = {id: 41};
        const suggestions = [];
        const suggest = value => suggestions.push(value);
        const determiningFilename = eventName === "onDeterminingFilename";
        const args = determiningFilename ? [item, suggest] : [item];
        let deferredSuggest;

        const unsubscribe = subscribe((...actualArgs) => {
            assert.deepEqual(actualArgs, args);
            assert.equal(actualArgs[0], item);

            if (determiningFilename) {
                assert.equal(actualArgs[1], suggest);
                deferredSuggest = actualArgs[1];

                return true;
            }
        });

        assert.equal(listeners.size, 1);
        const [listener] = listeners;
        assert.equal(listener(...args), determiningFilename ? true : undefined);

        if (determiningFilename) {
            assert.deepEqual(suggestions, []);
            await Promise.resolve();
            deferredSuggest({filename: "archive.zip"});
            assert.deepEqual(suggestions, [{filename: "archive.zip"}]);
        }

        unsubscribe();
        assert.equal(listeners.size, 0);
        assert.doesNotMatch(source, /\.(?:acceptDanger|cancel|download|erase|getFileIcon|open|pause|removeFile|resume|search|setUiOptions|show|showDefaultFolder)\b/, "Downloads methods survived tree shaking");
        assert.doesNotMatch(source, /download-validation|BlockDownloadError|USER_CANCELED|setTimeout/, "Download validation survived tree shaking");
    } finally {
        for (const [name, descriptor] of [["chrome", originalChrome], ["browser", originalBrowser]]) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
}

async function verifyRuntimeConsumer(path, eventName, source) {
    const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const originalBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
    const listeners = new Set();

    const event = {
        addListener: listener => listeners.add(listener),
        removeListener: listener => listeners.delete(listener),
    };

    try {
        Object.defineProperty(globalThis, "chrome", {configurable: true, value: {runtime: {id: "test", [eventName]: event}}});
        Object.defineProperty(globalThis, "browser", {configurable: true, value: undefined});
        const url = pathToFileURL(path);
        url.searchParams.set("consumer", eventName);
        const {subscribe} = await import(url.href);
        const message = {kind: "ping"};
        const sender = {id: "sender"};
        const response = {kind: "pong"};
        const replies = [];
        const sendResponse = value => replies.push(value);
        let result = true;

        const unsubscribe = subscribe((actualMessage, actualSender, actualSendResponse) => {
            assert.equal(actualMessage, message);
            assert.equal(actualSender, sender);
            assert.equal(actualSendResponse, sendResponse);
            actualSendResponse(response);

            return result;
        });

        assert.equal(listeners.size, 1);
        const [listener] = listeners;
        assert.equal(listener(message, sender, sendResponse), true);
        result = Promise.resolve(response);
        assert.equal(listener(message, sender, sendResponse), result);
        assert.equal(await result, response);
        assert.deepEqual(replies, [response, response]);
        unsubscribe();
        assert.equal(listeners.size, 0);
        assert.doesNotMatch(source, /\.(?:connect|connectNative|getContexts|getManifest|getPackageDirectoryEntry|getPlatformInfo|getBrowserInfo|getURL|openOptionsPage|reload|requestUpdateCheck|restart|restartAfterDelay|sendMessage|setUninstallURL)\b/, "Runtime methods survived tree shaking");
    } finally {
        for (const [name, descriptor] of [["chrome", originalChrome], ["browser", originalBrowser]]) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
}

async function verifyAlarmConsumer(path, exportName, source) {
    const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const originalBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
    const listeners = new Set();

    const onAlarm = {
        addListener: listener => listeners.add(listener),
        removeListener: listener => listeners.delete(listener),
    };

    try {
        Object.defineProperty(globalThis, "chrome", {configurable: true, value: {alarms: {onAlarm}}});
        Object.defineProperty(globalThis, "browser", {configurable: true, value: undefined});
        const url = pathToFileURL(path);
        url.searchParams.set("consumer", exportName);
        const {subscribe} = await import(url.href);
        const calls = [];
        const callback = alarm => calls.push(alarm);
        const filtered = exportName !== "onAlarm";
        const mapped = exportName === "onSpecificAlarms";
        let unsubscribe;

        if (mapped) unsubscribe = subscribe({sync: callback, cleanup: callback});
        else if (filtered) unsubscribe = subscribe("sync", callback);
        else unsubscribe = subscribe(callback);

        assert.equal(listeners.size, 1);
        const [listener] = listeners;

        const alarms = ["other", "Sync", "sync", "cleanup"].map(name => ({
            name, scheduledTime: 123456, persistAcrossSessions: false,
        }));

        for (const alarm of alarms) listener(alarm);

        const expected = mapped ? [alarms[2], alarms[3]] : filtered ? [alarms[2]] : alarms;
        assert.equal(calls.length, expected.length);
        calls.forEach((alarm, index) => assert.equal(alarm, expected[index]));
        unsubscribe();
        assert.equal(listeners.size, 0);
        assert.doesNotMatch(source, /\.(?:clear|clearAll|create|get|getAll)\b/, "Alarm methods survived tree shaking");

        if (!filtered) {
            assert.doesNotMatch(source, /\.name\b/, "The custom alarm filter survived a base-only import");
        }

        if (!mapped) {
            assert.doesNotMatch(source, /hasOwnProperty/, "The alarm map wrapper survived an unrelated import");
        }
    } finally {
        for (const [name, descriptor] of [["chrome", originalChrome], ["browser", originalBrowser]]) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
}

async function verifyCommandConsumer(path, exportName, source) {
    const originalChrome = Object.getOwnPropertyDescriptor(globalThis, "chrome");
    const originalBrowser = Object.getOwnPropertyDescriptor(globalThis, "browser");
    const listeners = new Set();

    const onCommand = {
        addListener: listener => listeners.add(listener),
        removeListener: listener => listeners.delete(listener),
    };

    try {
        Object.defineProperty(globalThis, "chrome", {configurable: true, value: {commands: {onCommand}}});
        Object.defineProperty(globalThis, "browser", {configurable: true, value: undefined});
        const url = pathToFileURL(path);
        url.searchParams.set("consumer", exportName);
        const {subscribe} = await import(url.href);
        const calls = [];
        const callback = (...args) => calls.push(args);
        const filtered = exportName !== "onCommand";
        const mapped = exportName === "onSpecificCommands";
        let unsubscribe;

        if (mapped) unsubscribe = subscribe({sync: callback, cleanup: callback});
        else if (filtered) unsubscribe = subscribe("sync", callback);
        else unsubscribe = subscribe(callback);

        assert.equal(listeners.size, 1);
        const [listener] = listeners;
        const tab = {id: 7};
        listener("other", tab);
        listener("Sync", tab);
        listener("sync", tab);
        listener("sync");
        listener("cleanup", tab);
        listener("cleanup");

        const expected = mapped
            ? [[tab], [undefined], [tab], [undefined]]
            : filtered
                ? [[tab], [undefined]]
                : [["other", tab], ["Sync", tab], ["sync", tab], ["sync"], ["cleanup", tab], ["cleanup"]];

        assert.deepEqual(calls, expected);

        unsubscribe();
        assert.equal(listeners.size, 0);
        assert.doesNotMatch(source, /\.getAll\b/, "Command methods survived tree shaking");

        if (!filtered) {
            assert.doesNotMatch(source, /===/, "The custom command filter survived a base-only import");
        }

        if (!mapped) {
            assert.doesNotMatch(source, /hasOwnProperty/, "The command map wrapper survived an unrelated import");
        }
    } finally {
        for (const [name, descriptor] of [["chrome", originalChrome], ["browser", originalBrowser]]) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
}

try {
    const entry = join(directory, "consumer.js");

    for (const {exportName, eventName, namespace} of consumers) {
        await writeFile(entry, [
            `import {${exportName}} from ${JSON.stringify(packageEntry)};`,
            `export const subscribe = ${exportName};`,
            "",
        ].join("\n"));

        await build({
            config: false,
            entry: {consumer: entry},
            outDir: join(directory, "dist"),
            format: ["esm"],
            outExtension: () => ({js: ".mjs"}),
            platform: "browser",
            target: "es2022",
            bundle: true,
            minify: true,
            dts: false,
            sourcemap: false,
            silent: true,
        });

        const source = await readFile(join(directory, "dist/consumer.mjs"), "utf8");
        assert.match(source, new RegExp(`\\.${eventName}\\b`), `The consumer lost ${exportName}`);

        if (namespace) {
            assert.match(source, new RegExp(`\\.${namespace}\\b`), `The consumer lost the ${namespace} API`);
        }

        const unusedEvents = eventNames.filter(name => name !== eventName).join("|");

        assert.doesNotMatch(
            source,
            new RegExp(`\\b(?:${unusedEvents})\\b`),
            "Unused event wrappers survived tree shaking"
        );

        assert.doesNotMatch(source, /callWithPromise|queryTabs|handlerBehaviorChanged|getAllFrames|getLastFocused|setBadgeText|getBadgeText|default_popup|createBrowserHarness|renderGeneratedFiles/);
        assert.doesNotMatch(source, /getDevices|getMute|createOrUpdateContextMenu|getPartitionKey|getVisits|launchWebAuthFlow|getAuthToken|getAutoLockDelay|getPermissionWarningsByManifest|addHostAccessRequest|getMediaStreamId/);

        if (exportName.startsWith("onAction")) {
            assert.match(source, /\.action\b/);
            assert.match(source, /\.browserAction\b/);
            assert.match(source, /manifest_version/);
        }

        if (exportName.startsWith("onNotifications")) {
            assert.doesNotMatch(source, /isAvailableNotifications|console\.warn|API is not supported/);
        }

        if (namespace === "commands") {
            await verifyCommandConsumer(join(directory, "dist/consumer.mjs"), exportName, source);
        }

        if (namespace === "alarms") {
            await verifyAlarmConsumer(join(directory, "dist/consumer.mjs"), exportName, source);
        }

        if (namespace === "runtime") {
            await verifyRuntimeConsumer(join(directory, "dist/consumer.mjs"), eventName, source);
        }

        if (namespace === "downloads") {
            await verifyDownloadsConsumer(join(directory, "dist/consumer.mjs"), eventName, source);
        }

        console.log(`Verified ${exportName} consumer tree shaking (${Buffer.byteLength(source)} bytes minified).`);
    }

    const originals = ["chrome", "browser", "opr"].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);

    const setGlobals = values => {
        for (const name of ["chrome", "browser", "opr"]) {
            Object.defineProperty(globalThis, name, {configurable: true, writable: true, value: values[name]});
        }
    };

    try {
        for (const {namespace} of availabilityApis) {
            const exportName = `isAvailable${namespace[0].toUpperCase()}${namespace.slice(1)}`;

            await writeFile(entry, [
                `import {${exportName}} from ${JSON.stringify(packageEntry)};`,
                `export const check = ${exportName};`,
                "",
            ].join("\n"));

            await build({
                config: false,
                entry: {consumer: entry},
                outDir: join(directory, "dist"),
                format: ["esm"],
                outExtension: () => ({js: ".mjs"}),
                platform: "browser",
                target: "es2022",
                bundle: true,
                minify: true,
                dts: false,
                sourcemap: false,
                silent: true,
            });

            const output = join(directory, "dist/consumer.mjs");
            const source = await readFile(output, "utf8");
            const selected = namespace === "action" ? ["action", "browserAction"] : namespace === "sidebar" ? ["sidePanel", "sidebarAction"] : [namespace];

            for (const name of selected) {
                assert.match(source, new RegExp(`\\.${name}\\b`), `The consumer lost the ${name} availability branch`);
            }

            const unusedNamespaces = availabilityApis.map(api => api.namespace)
                .filter(name => name !== "runtime" && !selected.includes(name));

            assert.doesNotMatch(source, new RegExp(`\\.(?:${unusedNamespaces.join("|")})\\b`), "Unrelated availability checks survived tree shaking");
            assert.doesNotMatch(source, new RegExp(`\\b(?:${eventNames.join("|")})\\b`), "Event wrappers survived availability tree shaking");
            assert.doesNotMatch(source, /addListener|removeListener|callWithPromise|\.query\b|\.getContexts\b|\.setIcon\b|createBrowserHarness|generateAvailability/);

            if (namespace !== "action") assert.doesNotMatch(source, /\.getManifest\b/);

            // Import without any extension globals; namespace selection must remain lazy.
            setGlobals({});
            const url = pathToFileURL(output);
            url.searchParams.set("availability", namespace);
            const {check} = await import(url.href);
            assert.equal(check(), false);

            if (namespace === "action") {
                for (const version of [2, 3]) {
                    const api = {runtime: {getManifest: () => ({manifest_version: version})}};
                    const selectedName = version === 3 ? "action" : "browserAction";
                    const otherName = version === 3 ? "browserAction" : "action";
                    api[otherName] = {};
                    setGlobals({chrome: api});
                    assert.equal(check(), false);
                    api[selectedName] = {};
                    assert.equal(check(), true);
                }
            } else if (namespace === "sidebar") {
                for (const globals of [
                    {chrome: {sidePanel: {}}},
                    {browser: {runtime: {id: "firefox"}, sidebarAction: {}}},
                    {chrome: {}, opr: {sidebarAction: {}}},
                ]) {
                    setGlobals(globals);
                    assert.equal(check(), true);
                }
            } else {
                for (const globalName of ["chrome", "browser"]) {
                    const api = {runtime: {id: "availability"}, [namespace]: {id: "availability"}};
                    setGlobals({[globalName]: api});
                    assert.equal(check(), true);
                    delete api[namespace];
                    assert.equal(check(), false);
                }
            }

            console.log(`Verified ${exportName} consumer tree shaking and lazy access (${Buffer.byteLength(source)} bytes minified).`);
        }
    } finally {
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else Reflect.deleteProperty(globalThis, name);
        }
    }
} finally {
    await rm(directory, {recursive: true, force: true});
}
