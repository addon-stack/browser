import type {BrowserContext, BrowserContextsHarness} from "../model";
import {createContextLifetime} from "../model/context-lifetime";
import {type BrowserMethod, createBrowserMethod} from "../primitives";
import {cloneRecord} from "../primitives/clone";
import type {RuntimeLastErrorController} from "../primitives/last-error";
import type {OffscreenTestApi} from "../types";

export interface BrowserOffscreenHarness {
    readonly api: OffscreenTestApi;
    readonly createDocument: BrowserMethod<typeof chrome.offscreen.createDocument, void>;
    readonly closeDocument: BrowserMethod<typeof chrome.offscreen.closeDocument, void>;
    readonly hasDocument: BrowserMethod<typeof chrome.offscreen.hasDocument, boolean>;
    /** Runs before registration. Delay/reject here to preserve the normal stateful operation. */
    readonly beforeCreate: BrowserMethod<(parameters: chrome.offscreen.CreateParameters) => Promise<void>, void>;
    /** Runs before disposal. Delay/reject here to leave the document alive until successful completion. */
    readonly beforeClose: BrowserMethod<() => Promise<void>, void>;
    readonly context: BrowserContext | undefined;
    /** Cancel pending operations and reset controls. Context fixtures are restored by harness/registry reset. */
    reset(): void;
}

const reasons = new Set<string>([
    "TESTING", "AUDIO_PLAYBACK", "IFRAME_SCRIPTING", "DOM_SCRAPING", "BLOBS", "DOM_PARSER",
    "USER_MEDIA", "DISPLAY_MEDIA", "WEB_RTC", "CLIPBOARD", "LOCAL_STORAGE", "WORKERS",
    "BATTERY_STATUS", "MATCH_MEDIA", "GEOLOCATION",
] as const satisfies readonly `${chrome.offscreen.Reason}`[]);

const failure = (method: string, message: string): Error => new Error(`offscreen.${method}: ${message}`);

const validateCreation = (input: chrome.offscreen.CreateParameters, base: string): {parameters: chrome.offscreen.CreateParameters; url: string} => {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        Object.keys(input).some(key => !["url", "reasons", "justification"].includes(key))) {
        throw failure("createDocument", "expected url, reasons and justification parameters.");
    }

    if (typeof input.url !== "string" || input.url.trim() === "") throw failure("createDocument", "url must be a non-empty extension URL or path.");

    if (typeof input.justification !== "string") throw failure("createDocument", "justification must be a string.");

    if (!Array.isArray(input.reasons) || input.reasons.length === 0 ||
        input.reasons.some(reason => !reasons.has(reason))) throw failure("createDocument", "reasons must be a non-empty array of supported reasons.");

    let url: URL;

    try {
        url = new URL(input.url, base);
    } catch {
        throw failure("createDocument", "invalid URL.");
    }

    const extension = new URL(base);

    // URL.origin is "null" for extension protocols in Node; compare the actual protocol and authority.
    if (url.protocol !== extension.protocol || url.host !== extension.host || url.username || url.password) {
        throw failure("createDocument", "URL must belong to this extension.");
    }

    return {parameters: cloneRecord(input), url: url.href};
};

export const createOffscreenHarness = (
    contexts: BrowserContextsHarness,
    getBaseUrl: () => string,
    lastError: RuntimeLastErrorController,
    nextSequence: () => number
): BrowserOffscreenHarness => {
    let scope = createContextLifetime("offscreen operations");
    let creating: symbol | undefined;
    let closing: symbol | undefined;

    const currentContext = (method: string): BrowserContext | undefined => {
        const found = contexts.list({kinds: ["offscreen"]});

        if (found.length > 1) throw failure(method, "multiple offscreen contexts are registered; expected a single document.");

        return found[0] && contexts.get(found[0].contextId);
    };

    const beforeCreate = createBrowserMethod<(parameters: chrome.offscreen.CreateParameters) => Promise<void>, void>({
        name: "offscreen.beforeCreate", invocation: "promise", nextSequence, implementation: async () => undefined,
    });

    const beforeClose = createBrowserMethod<() => Promise<void>, void>({
        name: "offscreen.beforeClose", invocation: "promise", nextSequence, implementation: async () => undefined,
    });

    const run = <T>(method: string, work: (assertActive: () => void) => Promise<T>): Promise<T> => {
        const owner = scope;

        const assertActive = (): void => {
            if (owner.lifetime.disposed) throw failure(method, "operation cancelled by reset.");
        };

        // Observe even late gate rejections, but never let late completion mutate a reset registry.
        return owner.lifetime.track(work(assertActive)).catch(error => {
            assertActive();
            throw error;
        });
    };

    const create = (input: chrome.offscreen.CreateParameters): Promise<void> => run("createDocument", async assertActive => {
        const {parameters, url} = validateCreation(input, getBaseUrl());

        if (creating) throw failure("createDocument", "document creation is already in progress.");

        if (closing || currentContext("createDocument")) throw failure("createDocument", "only a single offscreen document may be created.");

        const token = Symbol();
        creating = token;

        try {
            await beforeCreate.api(parameters);
            assertActive();

            if (currentContext("createDocument")) throw failure("createDocument", "only a single offscreen document may be created.");

            contexts.create({kind: "offscreen", url});
        } finally {
            if (creating === token) creating = undefined;
        }
    });

    const close = (): Promise<void> => run("closeDocument", async assertActive => {
        if (creating) throw failure("closeDocument", "document creation is still in progress.");

        if (closing) throw failure("closeDocument", "document closure is already in progress.");

        const context = currentContext("closeDocument");

        if (!context) throw failure("closeDocument", "no current offscreen document.");

        const token = Symbol();
        closing = token;

        try {
            await context.track(beforeClose.api());
            assertActive();

            // Handle identity matters: reset/replacement can reuse a deterministic contextId.
            if (contexts.get(context.info.contextId) !== context || context.disposed) throw failure("closeDocument", "target context was disposed or replaced.");

            const documentId = context.info.documentId;

            if (documentId && contexts.documents.get(documentId)) contexts.documents.remove(documentId);
            else contexts.remove(context.info.contextId); // Incomplete native fixtures may not have a document.
        } finally {
            if (closing === token) closing = undefined;
        }
    });

    const respond = <T>(response: Promise<T>, callback?: (value: T) => void): Promise<T> | undefined => {
        if (!callback) return response;

        void response.then(value => callback(value), error => lastError.runWithLastError(error, () => callback(undefined as T)));

        return undefined;
    };

    const createDocument = createBrowserMethod<typeof chrome.offscreen.createDocument, void>({
        name: "offscreen.createDocument", invocation: "dual", callback: "last", lastError, nextSequence,
        implementation: ((parameters: chrome.offscreen.CreateParameters, callback?: () => void) =>
            respond(create(parameters), callback ? () => callback() : undefined)) as typeof chrome.offscreen.createDocument,
    });

    const closeDocument = createBrowserMethod<typeof chrome.offscreen.closeDocument, void>({
        name: "offscreen.closeDocument", invocation: "dual", callback: "last", lastError, nextSequence,
        implementation: ((callback?: () => void) => respond(close(), callback ? () => callback() : undefined)) as typeof chrome.offscreen.closeDocument,
    });

    const hasDocument = createBrowserMethod<typeof chrome.offscreen.hasDocument, boolean>({
        name: "offscreen.hasDocument", invocation: "dual", callback: "last", lastError, nextSequence,
        implementation: ((callback?: (value: boolean) => void) =>
            respond(run("hasDocument", async () => Boolean(currentContext("hasDocument"))), callback)) as typeof chrome.offscreen.hasDocument,
    });

    return {
        api: {createDocument: createDocument.api, closeDocument: closeDocument.api, hasDocument: hasDocument.api},
        createDocument, closeDocument, hasDocument, beforeCreate, beforeClose,
        get context() {
            return currentContext("context");
        },
        reset() {
            const previous = scope;
            scope = createContextLifetime("offscreen operations");
            creating = closing = undefined;
            previous.dispose();

            for (const method of [createDocument, closeDocument, hasDocument, beforeCreate, beforeClose]) method.reset();
        },
    };
};
