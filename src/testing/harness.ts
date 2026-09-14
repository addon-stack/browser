import type {BrowserDelaysHarness, BrowserStorageHarness} from "./api";
import {type ConfigurableBrowserControls, type ConfigurableNamespaces, createConfigurableNamespaces} from "./api/configurable";
import {createBrowserDelaysHarness} from "./api/delays";
import {createPermissionsHarness, type PermissionsHarness} from "./api/permissions";
import {createRuntimeHarness, type RuntimeHarness} from "./api/runtime";
import {createScriptingHarness, type ScriptingHarness} from "./api/scripting";
import {createStorageHarness} from "./api/storage";
import {createTabsHarness, type TabsHarness} from "./api/tabs";
import {createWindowsHarness, type WindowsHarness} from "./api/windows";
import type {ListenerErrorBuffer} from "./environment";
import {createListenerErrorCapture} from "./environment/listener-errors";
import {sidebarDefaultForProfile} from "./environment/profiles";
import type {BrowserContextsHarness, BrowserStorageOptions, ContextRegistryOptions} from "./model";
import {createBrowserMemoryState} from "./model/browser-state";
import type {BrowserHarnessCall, BrowserMethodCall} from "./primitives";
import {createLastErrorController} from "./primitives/last-error";
import type {
    BrowserProfile,
    BrowserTestApi,
    OperaSidebarActionTestApi,
    SidebarFlavor,
} from "./types";

export interface BrowserHarnessOptions extends ContextRegistryOptions {
    extensionId?: string;
    manifest?: chrome.runtime.Manifest;
    permissions?: chrome.permissions.Permissions;
    messageSender?: chrome.runtime.MessageSender;
    tabs?: readonly chrome.tabs.Tab[];
    windows?: readonly chrome.windows.Window[];
    registeredContentScripts?: readonly chrome.scripting.RegisteredContentScript[];
    storage?: BrowserStorageOptions;
}

export interface BrowserCapabilitiesHarness {
    set(path: string, enabled: boolean): void;
    has(path: string): boolean;
}

export interface SidebarHarness {
    flavor: SidebarFlavor;
    readonly sidePanel: ConfigurableBrowserControls["sidePanel"];
    readonly firefox: ConfigurableBrowserControls["sidebarAction"];
    readonly opera: ConfigurableBrowserControls["operaSidebarAction"];
}

export interface ConfigurableHarness {
    readonly chrome: ConfigurableBrowserControls;
    readonly browser: ConfigurableBrowserControls;
    readonly active: ConfigurableBrowserControls;
    readonly chromeNamespaces: ConfigurableNamespaces;
    readonly browserNamespaces: ConfigurableNamespaces;
}

export interface BrowserHarness {
    readonly chrome: BrowserTestApi;
    readonly browser: BrowserTestApi;
    readonly runtime: RuntimeHarness;
    readonly contexts: BrowserContextsHarness;
    readonly permissions: PermissionsHarness;
    readonly tabs: TabsHarness;
    readonly windows: WindowsHarness;
    readonly scripting: ScriptingHarness;
    readonly storage: BrowserStorageHarness;
    readonly delays: BrowserDelaysHarness;
    readonly configurable: ConfigurableHarness;
    readonly capabilities: BrowserCapabilitiesHarness;
    readonly sidebar: SidebarHarness;
    readonly listenerErrors: ListenerErrorBuffer;
    readonly calls: readonly BrowserHarnessCall[];
    reset(): void;
    /** @internal Snapshot installation-owned profile settings for rollback and nested restoration. */
    captureProfileState(): () => void;
    /** @internal Used by the profile installer. */
    setActiveProfile(profile: BrowserProfile): void;
    /** @internal Used by the profile installer without overriding an explicit flavor. */
    setProfileSidebarFlavor(flavor: SidebarFlavor): void;
    /** @internal Applies a profile default unless the consumer explicitly changed the capability. */
    setProfileCapability(path: string, enabled: boolean): void;
    /** @internal Browser-profile view without changing the harness facades. */
    createProfileFacade(facade: "chrome" | "browser", includeBrowserInfo: boolean): BrowserTestApi;
    /** @internal Opera global for the currently selected flavor. */
    getOperaSidebarAction(): OperaSidebarActionTestApi | undefined;
    /** @internal Handler installed only when listener capture is requested. */
    getListenerErrorHandler(forward?: (...args: unknown[]) => void): (...args: unknown[]) => void;
}

interface NamedMethodCalls {
    namespace: string;
    source: Record<string, unknown>;
}

const methodCalls = ({namespace, source}: NamedMethodCalls): BrowserHarnessCall[] =>
    Object.entries(source).flatMap(([member, control]) => {
        if (!control || typeof control !== "object" || !("calls" in control)) return [];

        return (control as {calls: readonly BrowserMethodCall[]}).calls.map(call => ({
            ...call,
            api: `${namespace}.${member}`,
        }));
    });

const cloneFacade = (api: BrowserTestApi): BrowserTestApi => {
    const copy = Object.defineProperties({}, Object.getOwnPropertyDescriptors(api)) as BrowserTestApi;

    for (const [namespace, value] of Object.entries(api)) {
        if (value && typeof value === "object") {
            const namespaceCopy = Object.defineProperties({}, Object.getOwnPropertyDescriptors(value));
            Reflect.set(copy as object, namespace, namespaceCopy);
        }
    }

    return copy;
};

export const createBrowserHarness = (options: BrowserHarnessOptions = {}): BrowserHarness => {
    let sequence = 0;
    const nextSequence = (): number => ++sequence;
    const lastError = createLastErrorController();
    const state = createBrowserMemoryState({tabs: options.tabs, windows: options.windows});
    const configChrome = createConfigurableNamespaces({facade: "chrome", lastError, nextSequence});
    const configBrowser = createConfigurableNamespaces({facade: "browser", lastError, nextSequence});
    const runtime = createRuntimeHarness(options, lastError, nextSequence, state);
    state.onTabRemoved(runtime.removeTabContexts);
    const permissions = createPermissionsHarness(options.permissions, lastError, nextSequence);
    const tabs = createTabsHarness(state, lastError, nextSequence);
    const windows = createWindowsHarness(state, tabs, lastError, nextSequence);
    const scripting = createScriptingHarness(options.registeredContentScripts, lastError, nextSequence);
    const storage = createStorageHarness(options.storage, lastError, nextSequence);
    const listenerCapture = createListenerErrorCapture();

    const mergeDescriptors = (target: object, source: object): void => {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    };

    const chrome = configChrome.api as unknown as BrowserTestApi;
    const browser = configBrowser.api as unknown as BrowserTestApi;

    const storageFacades = (): BrowserTestApi["storage"] => ({
        ...storage.api,
        local: {...storage.api.local}, sync: {...storage.api.sync},
        session: {...storage.api.session}, managed: {...storage.api.managed},
    });

    chrome.storage = storageFacades();
    browser.storage = storageFacades();
    const delays = createBrowserDelaysHarness([chrome.downloads, browser.downloads], nextSequence);
    const sidePanelChromeApi = configChrome.api.sidePanel;
    const sidePanelBrowserApi = configBrowser.api.sidePanel;
    let activeProfile: BrowserProfile = "chrome";
    let sidebarFlavor: SidebarFlavor = "sidePanel";
    let sidebarExplicit = false;
    const explicitCapabilities = new Set<string>();

    const ownedChrome: Record<string, PropertyDescriptor> = {};
    const ownedBrowser: Record<string, PropertyDescriptor> = {};

    const mergeStateful = (): void => {
        mergeDescriptors(chrome.runtime, runtime.chromeApi);
        mergeDescriptors(browser.runtime, runtime.browserApi);
        mergeDescriptors(chrome.permissions, permissions.api);
        mergeDescriptors(browser.permissions, permissions.api);
        mergeDescriptors(chrome.tabs, tabs.api);
        mergeDescriptors(browser.tabs, tabs.api);
        mergeDescriptors(chrome.windows, windows.api);
        mergeDescriptors(browser.windows, windows.api);
        mergeDescriptors(chrome.scripting, scripting.api);
        mergeDescriptors(browser.scripting, scripting.api);

        for (const facade of [chrome, browser]) {
            facade.storage.onChanged = storage.api.onChanged;

            for (const area of ["local", "sync", "session", "managed"] as const) {
                mergeDescriptors(facade.storage[area], storage.api[area]);
            }
        }
    };

    mergeStateful();

    for (const [namespace, chromeNamespace, browserNamespace] of [
        ["runtime", runtime.chromeApi, runtime.browserApi],
        ["permissions", permissions.api, permissions.api],
        ["tabs", tabs.api, tabs.api],
        ["windows", windows.api, windows.api],
        ["scripting", scripting.api, scripting.api],
        ["storage.local", storage.api.local, storage.api.local],
        ["storage.sync", storage.api.sync, storage.api.sync],
        ["storage.session", storage.api.session, storage.api.session],
        ["storage.managed", storage.api.managed, storage.api.managed],
        ["storage", {onChanged: storage.api.onChanged}, {onChanged: storage.api.onChanged}],
    ] as const) {
        for (const [member, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(chromeNamespace))) {
            ownedChrome[`${namespace}.${member}`] = descriptor;
        }

        for (const [member, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(browserNamespace))) {
            ownedBrowser[`${namespace}.${member}`] = descriptor;
        }
    }

    ownedBrowser["runtime.getBrowserInfo"] = Object.getOwnPropertyDescriptor(
        runtime.browserApi,
        "getBrowserInfo"
    ) as PropertyDescriptor;

    const applySidebarFlavor = (): void => {
        Reflect.deleteProperty(chrome, "sidePanel");
        Reflect.deleteProperty(browser, "sidePanel");
        Reflect.deleteProperty(chrome, "sidebarAction");
        Reflect.deleteProperty(browser, "sidebarAction");

        if (sidebarFlavor === "sidePanel") {
            chrome.sidePanel = sidePanelChromeApi;
            browser.sidePanel = sidePanelBrowserApi;
        } else if (sidebarFlavor === "firefoxSidebarAction") {
            browser.sidebarAction = configBrowser.sidebarActionApi;
        }
    };

    applySidebarFlavor();

    const setOwnedCapability = (path: string, enabled: boolean): boolean => {
        if (!(path in ownedChrome) && !(path in ownedBrowser)) return false;

        const segments = path.split(".");
        const member = segments.pop()!;
        const chromeNamespace = segments.reduce<object>((value, key) => Reflect.get(value, key), chrome);
        const browserNamespace = segments.reduce<object>((value, key) => Reflect.get(value, key), browser);

        if (enabled) {
            if (path in ownedChrome) Object.defineProperty(chromeNamespace, member, ownedChrome[path]);

            if (path in ownedBrowser) Object.defineProperty(browserNamespace, member, ownedBrowser[path]);
        } else {
            Reflect.deleteProperty(chromeNamespace, member);
            Reflect.deleteProperty(browserNamespace, member);
        }

        return true;
    };

    const applyCapability = (path: string, enabled: boolean): void => {
        if (setOwnedCapability(path, enabled)) return;

        let recognized = false;

        for (const config of [configChrome, configBrowser]) {
            try {
                config.setCapability(path, enabled);
                recognized = true;
            } catch {
                // The other facade or a stateful namespace may own this path.
            }
        }

        if (!recognized) throw new Error(`Unknown browser capability "${path}"`);
    };

    const capabilities: BrowserCapabilitiesHarness = {
        has(path): boolean {
            const segments = path.split(".");
            const member = segments.pop()!;

            return [chrome, browser].some(facade => {
                const parent = segments.reduce<unknown>((value, key) =>
                    value && typeof value === "object" ? Reflect.get(value, key) : undefined, facade
                );

                return parent !== null && typeof parent === "object" && member in parent;
            });
        },
        set(path, enabled): void {
            applyCapability(path, enabled);
            explicitCapabilities.add(path);
        },
    };

    const sidebar: SidebarHarness = {
        get flavor() {
            return sidebarFlavor;
        },
        set flavor(value: SidebarFlavor) {
            sidebarFlavor = value;
            sidebarExplicit = true;
            applySidebarFlavor();
        },
        sidePanel: configChrome.controls.sidePanel,
        firefox: configBrowser.controls.sidebarAction,
        opera: configChrome.controls.operaSidebarAction,
    };

    const configurable: ConfigurableHarness = {
        chrome: configChrome.controls,
        browser: configBrowser.controls,
        get active() {
            return activeProfile === "firefox" || activeProfile === "safari"
                ? configBrowser.controls
                : configChrome.controls;
        },
        chromeNamespaces: configChrome,
        browserNamespaces: configBrowser,
    };

    const callSources: NamedMethodCalls[] = [
        {namespace: "runtime", source: runtime as unknown as Record<string, unknown>},
        {namespace: "permissions", source: permissions as unknown as Record<string, unknown>},
        {namespace: "tabs", source: tabs as unknown as Record<string, unknown>},
        {namespace: "windows", source: windows as unknown as Record<string, unknown>},
        {namespace: "scripting", source: scripting as unknown as Record<string, unknown>},
        {namespace: "delays", source: delays as unknown as Record<string, unknown>},
        ...(["local", "sync", "session", "managed"] as const).map(area => ({
            namespace: `storage.${area}`, source: storage[area] as unknown as Record<string, unknown>,
        })),
    ];

    return {
        chrome,
        browser,
        runtime,
        contexts: runtime.contextRegistry,
        permissions,
        tabs,
        windows,
        scripting,
        storage,
        delays,
        configurable,
        capabilities,
        sidebar,
        listenerErrors: listenerCapture,
        captureProfileState() {
            const previousProfile = activeProfile;
            const previousScheme = runtime.urlScheme;
            const previousFlavor = sidebarFlavor;
            const previousExplicit = sidebarExplicit;
            const previousBrowserInfoExplicit = explicitCapabilities.has("runtime.getBrowserInfo");
            const restoreForward = listenerCapture.captureForward();

            const descriptors = [{name: "chrome", api: chrome}, {name: "browser", api: browser}].flatMap(({name, api}) => [
                {path: `${name}.sidePanel`, key: "sidePanel", target: api},
                {path: `${name}.sidebarAction`, key: "sidebarAction", target: api},
                {path: `${name}.runtime.getBrowserInfo`, key: "getBrowserInfo", target: api.runtime},
            ]).map(entry => ({...entry, descriptor: Object.getOwnPropertyDescriptor(entry.target, entry.key)}));

            return () => {
                activeProfile = previousProfile;
                sidebarFlavor = previousFlavor;
                sidebarExplicit = previousExplicit;

                if (previousBrowserInfoExplicit) explicitCapabilities.add("runtime.getBrowserInfo");
                else explicitCapabilities.delete("runtime.getBrowserInfo");

                const cleanups = [
                    () => runtime.setUrlScheme(previousScheme),
                    restoreForward,
                    ...descriptors.map(({path, key, target, descriptor}) => () => {
                        let restored: boolean;

                        try {
                            restored = descriptor
                                ? Reflect.defineProperty(target, key, descriptor)
                                : Reflect.deleteProperty(target, key);
                        } catch (cause) {
                            throw new Error(`Unable to restore harness ${path}`, {cause});
                        }

                        if (!restored) throw new Error(`Unable to restore harness ${path}`);
                    }),
                ];

                const failures: unknown[] = [];

                for (const cleanup of cleanups) {
                    try {
                        cleanup();
                    } catch (error) {
                        failures.push(error);
                    }
                }

                if (failures.length > 0) throw new AggregateError(failures, "Unable to restore browser harness profile");
            };
        },
        get calls() {
            return [...callSources.flatMap(methodCalls), ...configChrome.calls, ...configBrowser.calls].sort(
                (left, right) => left.sequence - right.sequence
            );
        },
        createProfileFacade(facade, includeBrowserInfo) {
            const result = cloneFacade(facade === "chrome" ? chrome : browser);

            if (!includeBrowserInfo) Reflect.deleteProperty(result.runtime, "getBrowserInfo");

            return result;
        },
        getListenerErrorHandler(forward) {
            if (forward) listenerCapture.setForward(forward);

            return listenerCapture.handler;
        },
        getOperaSidebarAction() {
            return sidebarFlavor === "operaSidebarAction"
                ? (configChrome.operaSidebarActionApi as unknown as OperaSidebarActionTestApi)
                : undefined;
        },
        reset(): void {
            sequence = 0;
            state.reset();
            const cleanupErrors: unknown[] = [];

            try {
                runtime.reset();
            } catch (error) {
                cleanupErrors.push(error);
            }

            if (activeProfile === "firefox") runtime.setUrlScheme("moz-extension");
            else if (activeProfile === "safari") runtime.setUrlScheme("safari-web-extension");

            permissions.reset();
            tabs.reset();
            windows.reset();
            scripting.reset();
            storage.reset();
            configChrome.reset();
            configBrowser.reset();
            delays.reset();
            lastError.reset();
            listenerCapture.reset();
            explicitCapabilities.clear();
            mergeStateful();

            for (const path of new Set([...Object.keys(ownedChrome), ...Object.keys(ownedBrowser)])) {
                setOwnedCapability(path, true);
            }

            applyCapability("runtime.getBrowserInfo", activeProfile === "firefox");
            sidebarExplicit = false;
            sidebarFlavor = sidebarDefaultForProfile(activeProfile);
            applySidebarFlavor();

            if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, "Browser harness context cleanup failed");
        },
        setActiveProfile(profile) {
            activeProfile = profile;

            if (profile === "firefox") runtime.setUrlScheme("moz-extension");
            else if (profile === "safari") runtime.setUrlScheme("safari-web-extension");
            else if (profile !== "custom") runtime.setUrlScheme("chrome-extension");
        },
        setProfileCapability(path, enabled) {
            if (!explicitCapabilities.has(path)) applyCapability(path, enabled);
        },
        setProfileSidebarFlavor(flavor) {
            if (!sidebarExplicit) {
                sidebarFlavor = flavor;
                applySidebarFlavor();
            }
        },
    };
};
