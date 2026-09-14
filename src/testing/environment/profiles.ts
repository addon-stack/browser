import type {BrowserProfile, BrowserTestApi, ExtensionContextKind, OperaSidebarActionTestApi, SidebarFlavor} from "../types";
import type {ContextGlobals, LocationTestValue, NavigatorTestValue, TestGlobalValues, WindowTestValue} from "./types";

interface BrowserProfileTarget {
    readonly chrome: BrowserTestApi;
    readonly browser: BrowserTestApi;
    getOperaSidebarAction(): OperaSidebarActionTestApi | undefined;
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

export const profileGlobals = (harness: BrowserProfileTarget, profile: Exclude<BrowserProfile, "custom">): TestGlobalValues => {
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

export const sidebarDefaultForProfile = (profile: BrowserProfile): SidebarFlavor => {
    if (profile === "firefox") return "firefoxSidebarAction";

    if (profile === "opera") return "operaSidebarAction";

    if (profile === "chrome") return "sidePanel";

    return "none";
};
