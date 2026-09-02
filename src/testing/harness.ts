import {createBrowserMemoryState} from "./browser-state";
import {
    type ConfigurableBrowserControls,
    type ConfigurableNamespaces,
    createConfigurableNamespaces,
} from "./configurable";
import {createLastErrorController} from "./internal";
import {createListenerErrorCapture, type ListenerErrorBuffer} from "./listener-errors";
import {createPermissionsHarness, type PermissionsHarness} from "./permissions";
import {createRuntimeHarness, type RuntimeHarness} from "./runtime";
import {createScriptingHarness, type ScriptingHarness} from "./scripting";
import {createTabsHarness, type TabsHarness} from "./tabs";
import {createWindowsHarness, type WindowsHarness} from "./windows";
import type {BrowserMethodCall} from "./method";
import type {
    BrowserHarnessCall,
    BrowserProfile,
    BrowserTestApi,
    OperaSidebarActionTestApi,
    SidebarFlavor,
} from "./types";

export interface BrowserHarnessOptions {
    extensionId?: string;
    manifest?: chrome.runtime.Manifest;
    permissions?: chrome.permissions.Permissions;
    contexts?: readonly chrome.runtime.ExtensionContext[];
    messageSender?: chrome.runtime.MessageSender;
    tabs?: readonly chrome.tabs.Tab[];
    windows?: readonly chrome.windows.Window[];
    registeredContentScripts?: readonly chrome.scripting.RegisteredContentScript[];
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
    readonly permissions: PermissionsHarness;
    readonly tabs: TabsHarness;
    readonly windows: WindowsHarness;
    readonly scripting: ScriptingHarness;
    readonly configurable: ConfigurableHarness;
    readonly capabilities: BrowserCapabilitiesHarness;
    readonly sidebar: SidebarHarness;
    readonly listenerErrors: ListenerErrorBuffer;
    readonly calls: readonly BrowserHarnessCall[];
    reset(): void;
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

const sidebarDefaultForProfile = (profile: BrowserProfile): SidebarFlavor => {
    if (profile === "firefox") return "firefoxSidebarAction";
    if (profile === "opera") return "operaSidebarAction";
    if (profile === "chrome") return "sidePanel";
    return "none";
};

export const createBrowserHarness = (options: BrowserHarnessOptions = {}): BrowserHarness => {
    let sequence = 0;
    const nextSequence = (): number => ++sequence;
    const lastError = createLastErrorController();
    const state = createBrowserMemoryState({tabs: options.tabs, windows: options.windows});
    const configChrome = createConfigurableNamespaces({facade: "chrome", lastError, nextSequence});
    const configBrowser = createConfigurableNamespaces({facade: "browser", lastError, nextSequence});
    const runtime = createRuntimeHarness(options, lastError, nextSequence);
    const permissions = createPermissionsHarness(options.permissions, lastError, nextSequence);
    const tabs = createTabsHarness(state, lastError, nextSequence);
    const windows = createWindowsHarness(state, tabs, lastError, nextSequence);
    const scripting = createScriptingHarness(options.registeredContentScripts, lastError, nextSequence);
    const listenerCapture = createListenerErrorCapture();

    const mergeDescriptors = (target: object, source: object): void => {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    };

    const chrome = configChrome.api as unknown as BrowserTestApi;
    const browser = configBrowser.api as unknown as BrowserTestApi;
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
    };

    mergeStateful();

    for (const [namespace, chromeNamespace, browserNamespace] of [
        ["runtime", runtime.chromeApi, runtime.browserApi],
        ["permissions", permissions.api, permissions.api],
        ["tabs", tabs.api, tabs.api],
        ["windows", windows.api, windows.api],
        ["scripting", scripting.api, scripting.api],
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
        const [namespace, member] = path.split(".");
        const chromeNamespace = (chrome as unknown as Record<string, Record<string, unknown>>)[namespace];
        const browserNamespace = (browser as unknown as Record<string, Record<string, unknown>>)[namespace];
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
            const [namespace, member] = path.split(".");
            const chromeNamespace = (chrome as unknown as Record<string, Record<string, unknown> | undefined>)[
                namespace
            ];
            const browserNamespace = (browser as unknown as Record<string, Record<string, unknown> | undefined>)[
                namespace
            ];
            return (
                Boolean(chromeNamespace && member in chromeNamespace) ||
                Boolean(browserNamespace && member in browserNamespace)
            );
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
    ];

    return {
        chrome,
        browser,
        runtime,
        permissions,
        tabs,
        windows,
        scripting,
        configurable,
        capabilities,
        sidebar,
        listenerErrors: listenerCapture,
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
            runtime.reset();
            if (activeProfile === "firefox") runtime.setUrlScheme("moz-extension");
            else if (activeProfile === "safari") runtime.setUrlScheme("safari-web-extension");
            permissions.reset();
            tabs.reset();
            windows.reset();
            scripting.reset();
            configChrome.reset();
            configBrowser.reset();
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

export {sidebarDefaultForProfile};
