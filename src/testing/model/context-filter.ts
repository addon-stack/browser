export const matchesContextFilter = (
    context: Omit<chrome.runtime.ExtensionContext, "contextType"> & {
        contextType?: chrome.runtime.ExtensionContext["contextType"];
    },
    filter: chrome.runtime.ContextFilter
): boolean => {
    const checks: Array<[readonly unknown[] | undefined, unknown]> = [
        [filter.contextIds, context.contextId],
        [filter.contextTypes, context.contextType],
        [filter.documentIds, context.documentId],
        [filter.documentOrigins, context.documentOrigin],
        [filter.documentUrls, context.documentUrl],
        [filter.frameIds, context.frameId],
        [filter.tabIds, context.tabId],
        [filter.windowIds, context.windowId],
    ];

    if (typeof filter.incognito === "boolean" && context.incognito !== filter.incognito) return false;

    return checks.every(([expected, actual]) => !expected || expected.includes(actual));
};
