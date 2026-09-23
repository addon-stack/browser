import type {BrowserContext} from "../model";
import type {BrowserProfile, BrowserTestApi, ExtensionContextKind} from "../types";

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
    document?: Partial<Document> | undefined;
    location?: LocationTestValue | undefined;
    consoleError?: ((...args: unknown[]) => void) | undefined;
}

export interface ContextGlobals {
    location: LocationTestValue | undefined;
    window: WindowTestValue | undefined;
}

export interface InstallBrowserGlobalsOptions {
    /** Preserve DOM/navigator identities, or simulate the selected execution context (default). */
    environment?: "preserve" | "simulate";
    profile?: BrowserProfile;
    context?: ExtensionContextKind;
    /** Bind messaging APIs to this registered context; independent of simulated DOM context markers. */
    messageContext?: BrowserContext | string;
    captureListenerErrors?: boolean;
    /** Required to express non-standard namespace combinations with the custom profile. */
    globals?: TestGlobalValues;
}
