export const browser = (): typeof chrome => {
    const api = (globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome) as typeof chrome;

    if (!api) {
        throw new Error("WebExtension API not available in this context");
    }

    return api;
};
