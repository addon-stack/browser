const TEST_EXTENSION_ID = "test-extension-id";
const TEST_EXTENSION_ORIGIN = `chrome-extension://${TEST_EXTENSION_ID}`;

type FixtureOverrides<T> = Readonly<Partial<T>>;

function cloneFixtureValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map(item => cloneFixtureValue(item)) as T;
    }

    if (value !== null && typeof value === "object") {
        const prototype = Object.getPrototypeOf(value);

        if (prototype === Object.prototype || prototype === null) {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneFixtureValue(item)])) as T;
        }
    }

    return value;
}

function createFixture<T>(defaults: T, overrides: FixtureOverrides<T>): T {
    return cloneFixtureValue({...defaults, ...overrides});
}

export function createManifestFixture(
    overrides: FixtureOverrides<chrome.runtime.Manifest> = {}
): chrome.runtime.Manifest {
    return createFixture<chrome.runtime.Manifest>(
        {
            manifest_version: 3,
            name: "Test Extension",
            version: "1.0.0",
        },
        overrides
    );
}

export function createTabFixture(overrides: FixtureOverrides<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
    return createFixture<chrome.tabs.Tab>(
        {
            id: 1,
            index: 0,
            windowId: 1,
            active: true,
            selected: true,
            highlighted: true,
            pinned: false,
            frozen: false,
            incognito: false,
            discarded: false,
            autoDiscardable: true,
            groupId: -1,
            status: "complete",
            title: "Test Tab",
            url: `${TEST_EXTENSION_ORIGIN}/index.html`,
        },
        overrides
    );
}

export function createWindowFixture(overrides: FixtureOverrides<chrome.windows.Window> = {}): chrome.windows.Window {
    return createFixture<chrome.windows.Window>(
        {
            id: 1,
            focused: true,
            alwaysOnTop: false,
            incognito: false,
            state: "normal",
            type: "normal",
            tabs: [],
        },
        overrides
    );
}

export function createPermissionsFixture(
    overrides: FixtureOverrides<chrome.permissions.Permissions> = {}
): chrome.permissions.Permissions {
    return createFixture<chrome.permissions.Permissions>(
        {
            permissions: [],
            origins: [],
        },
        overrides
    );
}

export function createInstalledDetailsFixture(
    overrides: FixtureOverrides<chrome.runtime.InstalledDetails> = {}
): chrome.runtime.InstalledDetails {
    return createFixture<chrome.runtime.InstalledDetails>({reason: "install"}, overrides);
}

export function createMessageSenderFixture(
    overrides: FixtureOverrides<chrome.runtime.MessageSender> = {}
): chrome.runtime.MessageSender {
    return createFixture<chrome.runtime.MessageSender>(
        {
            id: TEST_EXTENSION_ID,
            origin: TEST_EXTENSION_ORIGIN,
            url: `${TEST_EXTENSION_ORIGIN}/background.html`,
        },
        overrides
    );
}

export function createExtensionContextFixture(
    overrides: FixtureOverrides<chrome.runtime.ExtensionContext> = {}
): chrome.runtime.ExtensionContext {
    return createFixture<chrome.runtime.ExtensionContext>(
        {
            contextId: "test-context-id",
            contextType: "BACKGROUND",
            frameId: -1,
            incognito: false,
            tabId: -1,
            windowId: -1,
        },
        overrides
    );
}

export function createInjectionResultFixture<TResult = undefined>(
    overrides: FixtureOverrides<chrome.scripting.InjectionResult<TResult>> = {}
): chrome.scripting.InjectionResult<TResult> {
    return createFixture<chrome.scripting.InjectionResult<TResult>>(
        {
            documentId: "test-document-id",
            frameId: 0,
        },
        overrides
    );
}
