export function renderWebNavigationEvent({namespace, exportName, eventName}) {
    return {
        usesBrowser: true,
        utilities: ["safeListener"],
        source: `export const ${exportName} = (
    callback: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[0],
    filters?: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[1]
): (() => void) => {
    const event = browser().${namespace}.${eventName};
    const listener = safeListener(callback);

    event.addListener(listener, filters);

    return () => event.removeListener(listener);
};`,
    };
}
