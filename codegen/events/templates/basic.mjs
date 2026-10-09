export function renderBasicEvent({namespace, exportName, eventName}) {
    return {
        usesBrowser: true,
        utilities: ["handleListener"],
        source: `export const ${exportName} = (
    callback: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[0]
): (() => void) => {
    return handleListener(browser().${namespace}.${eventName}, callback);
};`,
    };
}
