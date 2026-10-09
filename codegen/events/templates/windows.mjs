export function renderWindowsEvent({namespace, exportName, eventName}) {
    return {
        usesBrowser: true,
        utilities: ["safeListener"],
        imports: ['import type {WindowEventFilter} from "./types";'],
        source: `export const ${exportName} = (
    callback: Parameters<typeof chrome.${namespace}.${eventName}.addListener>[0],
    filter?: WindowEventFilter
): (() => void) => {
    const event = browser().${namespace}.${eventName};
    const listener = safeListener(callback);
    const args: Parameters<typeof chrome.${namespace}.${eventName}.addListener> = [listener];

    if (filter) args.push(filter);

    event.addListener(...args);

    return () => event.removeListener(listener);
};`,
    };
}
