import type {BrowserContextsHarness, BrowserDocument} from "./contexts";

/** One target per registered document, even when multiple contexts share its frame. */
export interface BrowserScriptTarget extends BrowserDocument {
    readonly contextIds: readonly string[];
}

export const scriptingError = (message: string, cause?: unknown): Error =>
    new Error(`scripting.executeScript: ${message}`, cause === undefined ? undefined : {cause});

export const selectScriptTargets = (
    target: chrome.scripting.InjectionTarget,
    contexts: BrowserContextsHarness,
    hasTab: (tabId: number) => boolean
): readonly BrowserScriptTarget[] => {
    const fail = (message: string): never => {
        throw scriptingError(message);
    };

    if (!target || typeof target !== "object" || Array.isArray(target)) fail("target must be an object");

    for (const key of Object.keys(target)) {
        if (!["tabId", "frameIds", "documentIds", "allFrames"].includes(key)) fail(`unsupported target option "${key}"`);
    }

    if (!Number.isInteger(target.tabId) || target.tabId < 0) fail("tabId must be a non-negative integer");

    if (!hasTab(target.tabId)) fail(`tab ${target.tabId} does not exist`);

    const {frameIds, documentIds, allFrames} = target;

    if (allFrames !== undefined && typeof allFrames !== "boolean") fail("allFrames must be a boolean");

    if ((frameIds !== undefined && documentIds !== undefined) || (allFrames && (frameIds !== undefined || documentIds !== undefined))) {
        fail("frameIds, documentIds and allFrames:true are mutually exclusive");
    }

    if (frameIds !== undefined && (!Array.isArray(frameIds) || !frameIds.length ||
        !frameIds.every(id => Number.isInteger(id) && id >= 0))) fail("frameIds must be a non-empty array of non-negative integers");

    if (documentIds !== undefined && (!Array.isArray(documentIds) || !documentIds.length ||
        !documentIds.every(id => typeof id === "string" && id.length > 0))) fail("documentIds must be a non-empty array of document IDs");

    const documents = contexts.documents.list().filter(document => document.tabId === target.tabId);
    let selected = documents;

    if (documentIds !== undefined) {
        for (const id of documentIds) {
            if (!documents.some(document => document.documentId === id)) fail(`document "${id}" does not exist in tab ${target.tabId}`);
        }

        selected = documents.filter(document => documentIds.includes(document.documentId));
    } else if (!allFrames) {
        const frames = frameIds ?? [0];

        for (const id of frames) {
            if (!documents.some(document => document.frameId === id)) fail(`frame ${id} has no registered document in tab ${target.tabId}`);
        }

        selected = documents.filter(document => frames.includes(document.frameId));
    }

    if (!selected.length) fail(`no registered documents in tab ${target.tabId}`);

    return Object.freeze(selected.sort((a, b) => a.frameId - b.frameId).map(document => Object.freeze({
        ...document,
        contextIds: Object.freeze(contexts.list({documentIds: [document.documentId]}).map(context => context.contextId)),
    })));
};
