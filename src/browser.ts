export const browser = (): typeof chrome => {
    if (globalThis.browser) {
        return globalThis.browser as unknown as typeof chrome;
    }
    return chrome;
};
