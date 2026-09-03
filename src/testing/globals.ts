import {type BrowserHarness, sidebarDefaultForProfile} from "./harness";
import type {BrowserProfile, BrowserTestApi, ExtensionContextKind} from "./types";

export interface NavigatorTestValue extends Partial<Navigator> {
    brave?: {
        isBrave?: () => boolean | Promise<boolean>;
    };
    userAgentData?: {
        brands?: Array<{brand: string; version: string}>;
        getHighEntropyValues?: (hints: string[]) => Promise<{
            brands?: Array<{brand: string; version: string}>;
            fullVersionList?: Array<{brand: string; version: string}>;
        }>;
    };
}

export type WindowTestValue = Partial<Window>;
export type LocationTestValue = Partial<Location>;

export interface TestGlobalValues {
    chrome?: BrowserTestApi | undefined;
    browser?: BrowserTestApi | undefined;
    opr?: {sidebarAction?: Partial<typeof opr.sidebarAction>} | undefined;
    safari?: object | undefined;
    navigator?: NavigatorTestValue | undefined;
    window?: WindowTestValue | undefined;
    location?: LocationTestValue | undefined;
    consoleError?: ((...args: unknown[]) => void) | undefined;
}

interface DescriptorChange {
    key: PropertyKey;
    descriptor: PropertyDescriptor | undefined;
    target: object;
}

const applyDescriptor = (target: object, key: PropertyKey, value: unknown): void => {
    if (typeof value === "undefined") {
        if (!Reflect.deleteProperty(target, key)) {
            throw new Error(`Unable to remove global ${String(key)}`);
        }

        return;
    }

    if (
        !Reflect.defineProperty(target, key, {
            configurable: true,
            enumerable: true,
            value,
            writable: true,
        })
    ) {
        throw new Error(`Unable to install global ${String(key)}`);
    }
};

const restoreChanges = (changes: readonly DescriptorChange[]): void => {
    for (const {descriptor, key, target} of [...changes].reverse()) {
        if (descriptor) {
            Reflect.defineProperty(target, key, descriptor);
        } else {
            Reflect.deleteProperty(target, key);
        }
    }
};

/** Installs only own properties present in `values` and restores their exact descriptors. */
export const installGlobals = (values: TestGlobalValues): (() => void) => {
    const changes: DescriptorChange[] = [];

    try {
        for (const key of ["chrome", "browser", "opr", "safari", "navigator", "window", "location"] as const) {
            if (!Object.hasOwn(values, key)) continue;

            changes.push({descriptor: Reflect.getOwnPropertyDescriptor(globalThis, key), key, target: globalThis});
            applyDescriptor(globalThis, key, values[key]);
        }

        if (Object.hasOwn(values, "consoleError")) {
            changes.push({
                descriptor: Reflect.getOwnPropertyDescriptor(console, "error"),
                key: "error",
                target: console,
            });

            applyDescriptor(console, "error", values.consoleError);
        }
    } catch (error) {
        restoreChanges(changes);
        throw error;
    }

    let restored = false;

    return (): void => {
        if (restored) return;

        restored = true;
        restoreChanges(changes);
    };
};

export interface ContextGlobals {
    location: LocationTestValue | undefined;
    window: WindowTestValue | undefined;
}

export const createContextGlobals = (kind: ExtensionContextKind): ContextGlobals => {
    if (kind === "serviceWorker" || kind === "none") {
        return {location: undefined, window: undefined};
    }

    const location =
        kind === "contentScript"
            ? ({
                hash: "",
                host: "example.test",
                hostname: "example.test",
                href: "https://example.test/content/page.html",
                origin: "https://example.test",
                pathname: "/content/page.html",
                port: "",
                protocol: "https:",
                search: "",
            } satisfies LocationTestValue)
            : ({
                pathname: kind === "backgroundPage" ? "/_generated_background_page.html" : "/index.html",
            } satisfies LocationTestValue);

    return {
        location,
        window: {location: location as Location} as WindowTestValue,
    };
};

export interface InstallBrowserGlobalsOptions {
    profile?: BrowserProfile;
    context?: ExtensionContextKind;
    captureListenerErrors?: boolean;
    /** Required to express non-standard namespace combinations with the custom profile. */
    globals?: TestGlobalValues;
}

const chromeNavigator = (): NavigatorTestValue => ({
    userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    userAgentData: {
        brands: [
            {brand: "Chromium", version: "126"},
            {brand: "Google Chrome", version: "126"},
        ],
    },
});

const firefoxNavigator = (): NavigatorTestValue => ({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0",
});

const operaNavigator = (): NavigatorTestValue => ({
    userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0",
    userAgentData: {
        brands: [
            {brand: "Chromium", version: "126"},
            {brand: "Opera", version: "112"},
        ],
    },
});

const safariNavigator = (): NavigatorTestValue => ({
    userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
});

const profileGlobals = (harness: BrowserHarness, profile: Exclude<BrowserProfile, "custom">): TestGlobalValues => {
    switch (profile) {
        case "chrome":
            return {
                browser: undefined,
                chrome: harness.chrome,
                navigator: chromeNavigator(),
                opr: undefined,
                safari: undefined,
            };
        case "firefox":
            return {
                browser: harness.browser,
                chrome: harness.chrome,
                navigator: firefoxNavigator(),
                opr: undefined,
                safari: undefined,
            };
        case "opera":
            return {
                browser: undefined,
                chrome: harness.chrome,
                navigator: operaNavigator(),
                opr: Object.defineProperty({}, "sidebarAction", {
                    configurable: true,
                    enumerable: true,
                    get: () => harness.getOperaSidebarAction(),
                }),
                safari: undefined,
            };
        case "safari":
            return {
                browser: harness.browser,
                chrome: harness.chrome,
                navigator: safariNavigator(),
                opr: undefined,
                safari: {},
            };
    }
};

/** Installs a coherent browser profile. Importing this module never mutates globals by itself. */
export const installBrowserGlobals = (
    harness: BrowserHarness,
    options: InstallBrowserGlobalsOptions = {}
): (() => void) => {
    const profile = options.profile ?? "chrome";
    const context = options.context ?? "extensionPage";

    harness.setActiveProfile(profile);
    harness.setProfileSidebarFlavor(sidebarDefaultForProfile(profile));

    if (profile !== "custom") {
        harness.setProfileCapability("runtime.getBrowserInfo", profile === "firefox");
    }

    const values: TestGlobalValues =
        profile === "custom"
            ? {...createContextGlobals(context), ...(options.globals ?? {})}
            : {...profileGlobals(harness, profile), ...createContextGlobals(context), ...(options.globals ?? {})};

    if (options.captureListenerErrors) {
        values.consoleError = harness.getListenerErrorHandler(console.error);
    }

    return installGlobals(values);
};
