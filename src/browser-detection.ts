import {browser} from "./browser";
import type {FirefoxRuntime} from "./types";

export enum BrowserName {
    Arc = "arc",
    Brave = "brave",
    Chrome = "chrome",
    Chromium = "chromium",
    Edge = "edge",
    Firefox = "firefox",
    Opera = "opera",
    Safari = "safari",
    Unknown = "unknown",
    Vivaldi = "vivaldi",
    Yandex = "yandex",
}

export enum BrowserFamily {
    Chromium = "chromium",
    Firefox = "firefox",
    Safari = "safari",
    Unknown = "unknown",
}

export enum BrowserGuessSource {
    BrowserGlobal = "browserGlobal",
    ExtensionUrl = "runtime.getURL",
    NavigatorBrave = "navigator.brave",
    RuntimeBrowserInfo = "runtime.getBrowserInfo",
    Unknown = "unknown",
    UserAgent = "navigator.userAgent",
    UserAgentData = "navigator.userAgentData",
}

export interface BrowserGuess {
    name: BrowserName;
    family: BrowserFamily;
    source: BrowserGuessSource;
    rawName?: string;
    vendor?: string;
    version?: string;
}

interface UserAgentBrand {
    brand: string;
    version: string;
}

interface NavigatorUADataLike {
    brands?: UserAgentBrand[];
    getHighEntropyValues?: (hints: string[]) => Promise<{
        brands?: UserAgentBrand[];
        fullVersionList?: UserAgentBrand[];
    }>;
}

type NavigatorWithBrowserHints = Navigator & {
    brave?: {
        isBrave?: () => boolean | Promise<boolean>;
    };
    userAgentData?: NavigatorUADataLike;
};

type GlobalBrowserHints = typeof globalThis & {
    opr?: unknown;
    safari?: unknown;
};

const browserFamilies: Record<BrowserName, BrowserFamily> = {
    [BrowserName.Arc]: BrowserFamily.Chromium,
    [BrowserName.Brave]: BrowserFamily.Chromium,
    [BrowserName.Chrome]: BrowserFamily.Chromium,
    [BrowserName.Chromium]: BrowserFamily.Chromium,
    [BrowserName.Edge]: BrowserFamily.Chromium,
    [BrowserName.Firefox]: BrowserFamily.Firefox,
    [BrowserName.Opera]: BrowserFamily.Chromium,
    [BrowserName.Safari]: BrowserFamily.Safari,
    [BrowserName.Unknown]: BrowserFamily.Unknown,
    [BrowserName.Vivaldi]: BrowserFamily.Chromium,
    [BrowserName.Yandex]: BrowserFamily.Chromium,
};

const createBrowserGuess = (
    name: BrowserName,
    source: BrowserGuessSource,
    details: Omit<BrowserGuess, "family" | "name" | "source"> = {}
): BrowserGuess => ({
    family: browserFamilies[name],
    name,
    source,
    ...details,
});

const getNavigator = (): NavigatorWithBrowserHints | undefined => {
    if (typeof navigator === "undefined") {
        return undefined;
    }

    return navigator as NavigatorWithBrowserHints;
};

const normalizeBrowserName = (name: string): BrowserName | undefined => {
    const value = name.toLowerCase();

    if (value.includes("microsoft edge") || /\bedg(?:e|a|ios)?\b/.test(value)) {
        return BrowserName.Edge;
    }

    if (value.includes("opera") || value.includes("opr")) {
        return BrowserName.Opera;
    }

    if (value.includes("brave")) {
        return BrowserName.Brave;
    }

    if (value.includes("vivaldi")) {
        return BrowserName.Vivaldi;
    }

    if (value.includes("yabrowser") || value.includes("yandex")) {
        return BrowserName.Yandex;
    }

    if (value.includes("arc")) {
        return BrowserName.Arc;
    }

    if (value.includes("firefox") || value.includes("fennec")) {
        return BrowserName.Firefox;
    }

    if (value.includes("safari") && !value.includes("chrome") && !value.includes("chromium")) {
        return BrowserName.Safari;
    }

    if (value.includes("google chrome") || value === "chrome") {
        return BrowserName.Chrome;
    }

    if (value.includes("chromium")) {
        return BrowserName.Chromium;
    }
};

const guessFromRuntimeBrowserInfo = async (): Promise<BrowserGuess | undefined> => {
    try {
        const runtime = browser().runtime as unknown as Partial<FirefoxRuntime>;

        if (typeof runtime.getBrowserInfo !== "function") {
            return undefined;
        }

        const info = await runtime.getBrowserInfo();
        const name = normalizeBrowserName(info.name) ?? BrowserName.Unknown;

        return createBrowserGuess(name, BrowserGuessSource.RuntimeBrowserInfo, {
            rawName: info.name,
            vendor: info.vendor,
            version: info.version,
        });
    } catch {
        return undefined;
    }
};

const getUserAgentBrands = async (navigatorApi: NavigatorWithBrowserHints | undefined): Promise<UserAgentBrand[]> => {
    const userAgentData = navigatorApi?.userAgentData;

    if (!userAgentData) {
        return [];
    }

    try {
        const highEntropyValues = await userAgentData.getHighEntropyValues?.(["fullVersionList"]);

        if (highEntropyValues?.fullVersionList?.length) {
            return highEntropyValues.fullVersionList;
        }
    } catch {
        // Low entropy brands are still useful when high entropy hints are unavailable.
    }

    return userAgentData.brands ?? [];
};

const guessFromBrands = (brands: UserAgentBrand[], includeGenericChromium: boolean): BrowserGuess | undefined => {
    const priority = [
        BrowserName.Edge,
        BrowserName.Opera,
        BrowserName.Brave,
        BrowserName.Vivaldi,
        BrowserName.Yandex,
        BrowserName.Arc,
        BrowserName.Chrome,
        BrowserName.Safari,
        BrowserName.Firefox,
    ];

    if (includeGenericChromium) {
        priority.push(BrowserName.Chromium);
    }

    for (const name of priority) {
        const brand = brands.find(item => normalizeBrowserName(item.brand) === name);

        if (brand) {
            return createBrowserGuess(name, BrowserGuessSource.UserAgentData, {
                rawName: brand.brand,
                version: brand.version,
            });
        }
    }
};

const guessFromBraveNavigator = async (
    navigatorApi: NavigatorWithBrowserHints | undefined
): Promise<BrowserGuess | undefined> => {
    const brave = navigatorApi?.brave;
    const isBrave = brave?.isBrave;

    if (typeof isBrave !== "function") {
        return undefined;
    }

    try {
        if (await isBrave.call(brave)) {
            return createBrowserGuess(BrowserName.Brave, BrowserGuessSource.NavigatorBrave);
        }
    } catch {
        return undefined;
    }
};

const guessFromBrowserGlobals = (): BrowserGuess | undefined => {
    const globalBrowserHints = globalThis as GlobalBrowserHints;

    if (typeof globalBrowserHints.opr !== "undefined") {
        return createBrowserGuess(BrowserName.Opera, BrowserGuessSource.BrowserGlobal);
    }

    if (typeof globalBrowserHints.safari !== "undefined") {
        return createBrowserGuess(BrowserName.Safari, BrowserGuessSource.BrowserGlobal);
    }
};

const guessFromUserAgent = (userAgent: string | undefined): BrowserGuess | undefined => {
    if (!userAgent) {
        return undefined;
    }

    const patterns: Array<[BrowserName, RegExp]> = [
        [BrowserName.Edge, /\bEdg(?:A|iOS)?\/([\d.]+)/],
        [BrowserName.Opera, /\b(?:OPR|Opera)\/([\d.]+)/],
        [BrowserName.Vivaldi, /\bVivaldi\/([\d.]+)/],
        [BrowserName.Yandex, /\bYaBrowser\/([\d.]+)/],
        [BrowserName.Arc, /\bArc\/([\d.]+)/],
        [BrowserName.Firefox, /\b(?:Firefox|FxiOS)\/([\d.]+)/],
        [BrowserName.Chrome, /\b(?:Chrome|CriOS)\/([\d.]+)/],
        [BrowserName.Chromium, /\bChromium\/([\d.]+)/],
        [BrowserName.Safari, /\bVersion\/([\d.]+).*Safari\//],
    ];

    for (const [name, pattern] of patterns) {
        const match = userAgent.match(pattern);

        if (match) {
            return createBrowserGuess(name, BrowserGuessSource.UserAgent, {
                version: match[1],
            });
        }
    }
};

const guessFromExtensionUrl = (): BrowserGuess | undefined => {
    try {
        const protocol = new URL(browser().runtime.getURL("")).protocol;

        if (protocol === "moz-extension:") {
            return createBrowserGuess(BrowserName.Firefox, BrowserGuessSource.ExtensionUrl);
        }

        if (protocol === "safari-extension:" || protocol === "safari-web-extension:") {
            return createBrowserGuess(BrowserName.Safari, BrowserGuessSource.ExtensionUrl);
        }

        if (protocol === "chrome-extension:") {
            return createBrowserGuess(BrowserName.Chromium, BrowserGuessSource.ExtensionUrl);
        }
    } catch {
        return undefined;
    }
};

export const guessBrowser = async (): Promise<BrowserGuess> => {
    const runtimeInfo = await guessFromRuntimeBrowserInfo();

    if (runtimeInfo) {
        return runtimeInfo;
    }

    const navigatorApi = getNavigator();
    const brands = await getUserAgentBrands(navigatorApi);
    const specificBrand = guessFromBrands(brands, false);

    if (specificBrand) {
        return specificBrand;
    }

    const braveInfo = await guessFromBraveNavigator(navigatorApi);

    if (braveInfo) {
        return braveInfo;
    }

    const browserGlobalInfo = guessFromBrowserGlobals();

    if (browserGlobalInfo) {
        return browserGlobalInfo;
    }

    const genericBrand = guessFromBrands(brands, true);

    if (genericBrand) {
        return genericBrand;
    }

    const userAgentInfo = guessFromUserAgent(navigatorApi?.userAgent);

    if (userAgentInfo) {
        return userAgentInfo;
    }

    const extensionUrlInfo = guessFromExtensionUrl();

    if (extensionUrlInfo) {
        return extensionUrlInfo;
    }

    return createBrowserGuess(BrowserName.Unknown, BrowserGuessSource.Unknown);
};

export const isBrowser = (guess: BrowserGuess, ...names: BrowserName[]): boolean => names.includes(guess.name);

export const isBrowserFamily = (guess: BrowserGuess, family: BrowserFamily): boolean => guess.family === family;
