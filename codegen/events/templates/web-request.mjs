export function renderWebRequestEvent({namespace, exportName, eventName}) {
    return {
        usesBrowser: true,
        utilities: ["safeListener"],
        source: `export const ${exportName} = (
    callback: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[0],
    filter: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[1],
    extraInfoSpec?: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[2]
): (() => void) => {
    const event = browser().${namespace}.${eventName};
    const listener = safeListener(callback);

    event.addListener(listener, filter, extraInfoSpec);

    return () => event.removeListener(listener);
};`,
    };
}
