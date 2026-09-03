import {browser} from "./browser";

export const isBackground = (): boolean => {
    let runtime: typeof chrome.runtime | undefined;

    try {
        runtime = browser()?.runtime;
    } catch {
        return false;
    }

    if (!runtime?.id) {
        return false;
    }

    if (typeof runtime.getManifest !== "function") {
        return false;
    }

    const manifest = runtime.getManifest();

    if (!manifest.background) {
        return false;
    }

    // @ts-expect-error Chrome's manifest union does not expose legacy background scripts on MV3.
    if (manifest.manifest_version === 3 && !manifest.background.scripts) {
        return typeof window === "undefined";
    }

    const backgroundPaths = ["/_generated_background_page.html"];

    return window !== undefined && backgroundPaths.includes(location.pathname);
};
