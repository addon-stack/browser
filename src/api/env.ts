import {browser} from "./browser";

export const isBackground = (): boolean => {
    try {
        const runtime = browser()?.runtime;

        if (!runtime?.id || typeof runtime.getManifest !== "function") {
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

        return typeof window !== "undefined" && typeof location !== "undefined" && backgroundPaths.includes(location.pathname);
    } catch {
        return false;
    }
};
