export function renderBasicEvent({namespace, exportName, eventName, callbackType}) {
    return {
        usesBrowser: true,
        utilities: ["handleListener"],
        source: `export const ${exportName} = (
    callback: ${callbackType ?? `Parameters<typeof chrome.${namespace}.${eventName}.addListener>[0]`}
): (() => void) => {
    return handleListener(browser().${namespace}.${eventName}, callback);
};`,
    };
}
