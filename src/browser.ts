export const browser = (): typeof chrome => {
    const api = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome;

    if (!api) {
        throw new Error("WebExtension API not available in this context");
    }

    return chrome;
};

export const isFirefox = (): boolean => {
    let isFirefox = false;

    try {
        // @ts-expect-error
        isFirefox = !!browser().runtime.getBrowserInfo;
    } catch (_e) {}

    return isFirefox;
};
