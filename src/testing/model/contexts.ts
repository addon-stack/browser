import type {BrowserEventHarness} from "../primitives";
import {cloneRecord} from "../primitives/clone";
import type {BrowserMemoryState} from "./browser-state";
import {matchesContextFilter} from "./context-filter";
import {type BrowserContextLifetime, createContextLifetime} from "./context-lifetime";

export type BrowserContextKind = "background" | "extensionPage" | "offscreen" | "contentScript";

export interface BrowserDocumentOptions {
    documentId?: string;
    url: string;
    tabId?: number;
    frameId?: number;
    parentFrameId?: number;
    windowId?: number;
    incognito?: boolean;
}

export interface BrowserDocument extends Required<Omit<BrowserDocumentOptions, "parentFrameId">> {
    readonly parentFrameId?: number;
    readonly origin: string;
}

export interface BrowserContextOptions extends Omit<BrowserDocumentOptions, "url" | "parentFrameId"> {
    contextId?: string;
    kind: BrowserContextKind;
    url?: string;
    /** Extension-page presentation; other kinds select their own runtime ContextType. */
    contextType?: "TAB" | "POPUP" | "SIDE_PANEL" | "DEVELOPER_TOOLS";
}

export interface BrowserContextInfo extends Omit<chrome.runtime.ExtensionContext, "contextType"> {
    kind: BrowserContextKind;
    /** Script URL for workers; document URL for document-backed contexts. */
    url: string;
    contextType?: chrome.runtime.ExtensionContext["contextType"];
}

type MessageArgs = Parameters<Parameters<typeof chrome.runtime.onMessage.addListener>[0]>;

export interface BrowserContext extends BrowserContextLifetime {
    readonly info: BrowserContextInfo;
    /** Context-local manual subscriptions. Message routing is not enabled by registration. */
    readonly onMessage: BrowserEventHarness<MessageArgs>;
}

export interface BrowserContextFilter extends chrome.runtime.ContextFilter {
    kinds?: readonly BrowserContextKind[];
}

export interface BrowserDocumentsHarness {
    create(options: BrowserDocumentOptions): BrowserDocument;
    get(documentId: string): BrowserDocument | undefined;
    list(): readonly BrowserDocument[];
    /** Removes this document, its child frames and all their contexts. */
    remove(documentId: string): void;
}

export interface BrowserContextsHarness {
    readonly documents: BrowserDocumentsHarness;
    create(options: BrowserContextOptions): BrowserContext;
    get(contextId: string): BrowserContext | undefined;
    list(filter?: BrowserContextFilter): readonly BrowserContextInfo[];
    remove(contextId: string): void;
    reset(): void;
}

export type BrowserContextSeed = BrowserContextOptions | chrome.runtime.ExtensionContext;

export interface ContextRegistryOptions {
    contexts?: readonly BrowserContextSeed[];
    documents?: readonly BrowserDocumentOptions[];
}

const runtimeTypes = new Set(["BACKGROUND", "TAB", "POPUP", "OFFSCREEN_DOCUMENT", "SIDE_PANEL", "DEVELOPER_TOOLS"]);
const contextKinds = new Set<BrowserContextKind>(["background", "extensionPage", "offscreen", "contentScript"]);

const fail = (message: string): never => {
    throw new Error(`Browser test contexts: ${message}`);
};

const parseUrl = (value: string): URL => {
    try {
        return new URL(value);
    } catch {
        return fail(`invalid absolute URL "${value}"`);
    }
};

// URL.origin is "null" for extension schemes in Node; preserve their actual origin explicitly.
const documentOrigin = (url: URL): string =>
    ["chrome-extension:", "moz-extension:", "safari-web-extension:"].includes(url.protocol)
        ? `${url.protocol}//${url.host}`
        : url.origin;

export const createContextRegistry = (
    options: ContextRegistryOptions,
    getUrl: (path: string) => string,
    state?: BrowserMemoryState
) => {
    const initialContexts = cloneRecord(options.contexts ?? []);
    const initialDocuments = cloneRecord(options.documents ?? []);
    const documents = new Map<string, BrowserDocument>();
    const contexts = new Map<string, {handle: BrowserContext; info: BrowserContextInfo; dispose(): void}>();
    const resetListeners = new Set<() => void>();
    let documentCounter = 0;
    let contextCounter = 0;
    let replacing = false;

    const assertWritable = (): void => {
        if (replacing) fail("cannot register resources during reset or replacement");
    };

    const nextId = (kind: "document" | "context"): string => {
        let id: string;

        do {
            id = kind === "document" ? `test-document-${++documentCounter}` : `test-context-${++contextCounter}`;
        } while (kind === "document" ? documents.has(id) : contexts.has(id));

        return id;
    };

    const documentFor = (input: BrowserDocumentOptions): BrowserDocument => {
        const url = parseUrl(input.url);
        const tabId = input.tabId ?? -1;
        const frameId = input.frameId ?? (tabId >= 0 ? 0 : -1);
        const tab = state?.tabs.get(tabId);

        if (!Number.isInteger(tabId) || tabId < -1) fail("tabId must be -1 or a non-negative integer");

        if (!Number.isInteger(frameId) || frameId < -1) fail("frameId must be -1 or a non-negative integer");

        if (input.windowId !== undefined && (!Number.isInteger(input.windowId) || input.windowId < -1)) fail("windowId must be -1 or a non-negative integer");

        if (tabId >= 0 && frameId < 0) fail("a tab document requires a non-negative frameId");

        if (state && tabId >= 0 && !tab) fail(`tab ${tabId} does not exist`);

        if (tab && input.windowId !== undefined && input.windowId !== tab.windowId) fail("document windowId disagrees with its tab");

        if (tab && input.incognito !== undefined && input.incognito !== tab.incognito) fail("document incognito disagrees with its tab");

        if (input.parentFrameId !== undefined) {
            if (tabId < 0 || frameId <= 0 || input.parentFrameId === frameId ||
                ![...documents.values()].some(item => item.tabId === tabId && item.frameId === input.parentFrameId)) {
                fail("parentFrameId must identify an existing different frame in the same tab");
            }
        }

        const documentId = input.documentId ?? nextId("document");

        if (!documentId) fail("documentId must not be empty");

        if (documents.has(documentId)) fail(`document "${documentId}" already exists`);

        if (tabId >= 0 && [...documents.values()].some(item => item.tabId === tabId && item.frameId === frameId)) {
            fail(`frame ${frameId} in tab ${tabId} already has a document; remove it before navigating`);
        }

        return {
            documentId,
            url: url.href,
            origin: documentOrigin(url),
            tabId,
            frameId,
            windowId: tab?.windowId ?? input.windowId ?? -1,
            incognito: tab?.incognito ?? input.incognito ?? false,
            ...(input.parentFrameId === undefined ? {} : {parentFrameId: input.parentFrameId}),
        };
    };

    const register = (info: BrowserContextInfo): BrowserContext => {
        if (!info.contextId) fail("contextId must not be empty");

        if (contexts.has(info.contextId)) fail(`context "${info.contextId}" already exists`);

        const scope = createContextLifetime(info.contextId);

        const handle: BrowserContext = {
            get info() {
                return snapshotContext(info);
            },
            get disposed() {
                return scope.lifetime.disposed;
            },
            signal: scope.lifetime.signal,
            onDispose: scope.lifetime.onDispose,
            track: scope.lifetime.track,
            onMessage: scope.event<MessageArgs>(),
        };

        contexts.set(info.contextId, {handle, info, dispose: scope.dispose});

        return handle;
    };

    const removeContexts = (ids: readonly string[]): void => {
        const removed = ids.flatMap(id => {
            const context = contexts.get(id);
            contexts.delete(id);

            return context ? [context] : [];
        });

        const errors: unknown[] = [];

        for (const context of removed) {
            try {
                context.dispose();
            } catch (error) {
                errors.push(error);
            }
        }

        if (errors.length > 0) throw new AggregateError(errors, "Browser test context cleanup failed");
    };

    const removeDocuments = (ids: Set<string>): void => {
        let previousSize: number;

        do {
            previousSize = ids.size;

            for (const document of documents.values()) {
                if ([...ids].some(id => {
                    const parent = documents.get(id);

                    return parent && parent.tabId >= 0 && document.tabId === parent.tabId &&
                        (parent.frameId === 0 || document.parentFrameId === parent.frameId);
                })) ids.add(document.documentId);
            }
        } while (ids.size > previousSize);

        for (const id of ids) documents.delete(id);

        removeContexts([...contexts].filter(([, {info}]) => info.documentId && ids.has(info.documentId)).map(([id]) => id));
    };

    const documentControls: BrowserDocumentsHarness = {
        create(input) {
            assertWritable();
            const document = documentFor(input);
            documents.set(document.documentId, document);

            return snapshotDocument(document);
        },
        get(id) {
            const value = documents.get(id);

            return value && snapshotDocument(value);
        },
        list() {
            return [...documents.values()].map(snapshotDocument);
        },
        remove(id) {
            removeDocuments(new Set([id]));
        },
    };

    const create = (input: BrowserContextOptions): BrowserContext => {
        assertWritable();

        if (!contextKinds.has(input.kind)) fail(`unknown context kind "${input.kind}"`);

        const id = input.contextId ?? nextId("context");

        if (!id || contexts.has(id)) fail(`invalid or duplicate contextId "${id}"`);

        const contextType = input.kind === "contentScript" ? undefined
            : input.kind === "background" ? "BACKGROUND"
                : input.kind === "offscreen" ? "OFFSCREEN_DOCUMENT" : input.contextType ?? "TAB";

        if (input.contextType !== undefined && (input.kind !== "extensionPage" ||
            !["TAB", "POPUP", "SIDE_PANEL", "DEVELOPER_TOOLS"].includes(input.contextType))) fail("contextType is only valid for extension pages");

        if (input.documentId === "") fail("documentId must not be empty");

        let document = input.documentId ? documents.get(input.documentId) : undefined;
        let pendingDocument: BrowserDocument | undefined;

        if (input.documentId && !document) fail(`document "${input.documentId}" does not exist`);

        if (input.kind !== "background" && !document) {
            if (input.kind === "contentScript" && (input.tabId === undefined || input.tabId < 0 || !input.url)) {
                fail("a content script requires a registered document or a tabId and URL");
            }

            pendingDocument = documentFor({
                ...input,
                // An offscreen page has a top-level frame even though it has no tab or window.
                frameId: input.frameId ?? (input.kind === "offscreen" ? 0 : undefined),
                url: input.url ?? getUrl(input.kind === "offscreen" ? "offscreen.html" : "index.html"),
            });

            document = pendingDocument;
        }

        if (document) {
            document = snapshotDocument(document);

            if (input.kind === "contentScript" && document.tabId < 0) fail("a content script document must belong to a tab");

            for (const key of ["tabId", "frameId", "windowId", "incognito"] as const) {
                if (input[key] !== undefined && input[key] !== document[key]) fail(`${key} disagrees with the document`);
            }

            if (input.url !== undefined && parseUrl(input.url).href !== document.url) fail("URL disagrees with the document");
        } else if ((input.tabId !== undefined && input.tabId !== -1) ||
            (input.frameId !== undefined && input.frameId !== -1) ||
            (input.windowId !== undefined && input.windowId !== -1)) {
            fail("a background worker cannot belong to a tab, frame or window");
        }

        const info: BrowserContextInfo = {
            contextId: id,
            kind: input.kind,
            url: document?.url ?? parseUrl(input.url ?? getUrl("background.js")).href,
            ...(contextType === undefined ? {} : {contextType}),
            tabId: document?.tabId ?? -1,
            frameId: document?.frameId ?? -1,
            windowId: document?.windowId ?? -1,
            incognito: document?.incognito ?? input.incognito ?? false,
            ...(document ? {documentId: document.documentId, documentUrl: document.url, documentOrigin: document.origin} : {}),
        };

        if (input.kind !== "contentScript" && documentOrigin(parseUrl(info.url)) !== documentOrigin(parseUrl(getUrl("")))) {
            fail("extension context URL must belong to this extension; use a native fixture for malformed-context tests");
        }

        if (input.kind === "offscreen" && (info.tabId !== -1 || info.frameId !== 0 || info.windowId !== -1)) {
            fail("an offscreen document must not belong to a tab or window and requires frameId 0");
        }

        if (pendingDocument) documents.set(pendingDocument.documentId, pendingDocument);

        return register(info);
    };

    const prepareRuntimeContext = (
        input: chrome.runtime.ExtensionContext,
        targetDocuments: Map<string, BrowserDocument>
    ): BrowserContextInfo => {
        if (!runtimeTypes.has(input.contextType)) fail(`unsupported runtime contextType "${input.contextType}"`);

        // Native fixture fields are preserved, including intentionally incomplete legacy fixtures.
        const kind = input.contextType === "BACKGROUND" ? "background"
            : input.contextType === "OFFSCREEN_DOCUMENT" ? "offscreen" : "extensionPage";

        if (input.documentId && input.documentUrl) {
            const url = parseUrl(input.documentUrl);

            const document: BrowserDocument = {
                documentId: input.documentId,
                url: url.href,
                origin: input.documentOrigin ?? documentOrigin(url),
                tabId: input.tabId,
                frameId: input.frameId,
                windowId: input.windowId,
                incognito: input.incognito,
            };

            const existing = targetDocuments.get(input.documentId);

            if (existing) {
                for (const key of ["url", "tabId", "frameId", "windowId", "incognito"] as const) {
                    if (snapshotDocument(existing)[key] !== document[key]) fail(`runtime context disagrees with document "${input.documentId}"`);
                }
            } else {
                if (document.tabId >= 0 && [...targetDocuments.values()].some(value =>
                    value.tabId === document.tabId && value.frameId === document.frameId
                )) fail("runtime context frame already has a different document");

                targetDocuments.set(document.documentId, document);
            }
        }

        return {...cloneRecord(input), kind, url: input.documentUrl ?? getUrl("background.js")};
    };

    const addRuntimeContext = (input: chrome.runtime.ExtensionContext): void => {
        assertWritable();

        if (!input.contextId || contexts.has(input.contextId)) fail(`invalid or duplicate contextId "${input.contextId}"`);

        const prepared = new Map(documents);
        const info = prepareRuntimeContext(input, prepared);

        for (const [id, document] of prepared) documents.set(id, document);

        register(info);
    };

    const list = (filter: BrowserContextFilter = {}): readonly BrowserContextInfo[] => {
        const knownFields = new Set(["kinds", "contextIds", "contextTypes", "documentIds", "documentOrigins", "documentUrls", "frameIds", "tabIds", "windowIds", "incognito"]);

        for (const key of Object.keys(filter)) if (!knownFields.has(key)) fail(`unsupported context filter "${key}"`);

        return [...contexts.values()].map(({info}) => snapshotContext(info)).filter(info =>
            (!filter.kinds || filter.kinds.includes(info.kind)) &&
            matchesContextFilter(info, filter)
        );
    };

    const snapshotDocument = (value: BrowserDocument): BrowserDocument => {
        const tab = state?.tabs.get(value.tabId);

        return {...value, windowId: tab?.windowId ?? value.windowId, incognito: tab?.incognito ?? value.incognito};
    };

    const snapshotContext = (info: BrowserContextInfo): BrowserContextInfo => {
        const tab = state?.tabs.get(info.tabId);

        return {...cloneRecord(info), windowId: tab?.windowId ?? info.windowId, incognito: tab?.incognito ?? info.incognito};
    };

    const clear = (): void => {
        documents.clear();
        removeContexts([...contexts.keys()]);
    };

    const loadInitial = (): void => {
        documentCounter = 0;
        contextCounter = 0;

        for (const document of initialDocuments) documentControls.create(document);

        for (const context of initialContexts) {
            if ("kind" in context) create(context);
            else addRuntimeContext(context);
        }
    };

    const registry: BrowserContextsHarness = {
        documents: documentControls,
        create,
        get(id) {
            return contexts.get(id)?.handle;
        },
        list,
        remove(id) {
            removeContexts([id]);
        },
        reset() {
            assertWritable();
            replacing = true;
            const failures: unknown[] = [];

            try {
                for (const listener of [...resetListeners]) {
                    try {
                        listener();
                    } catch (error) {
                        failures.push(error);
                    }
                }

                try {
                    clear();
                } catch (error) {
                    failures.push(error);
                }
            } finally {
                replacing = false;
                loadInitial();
            }

            if (failures.length > 0) throw new AggregateError(failures, "Browser test context cleanup failed");
        },
    };

    loadInitial();

    return {
        registry,
        onReset(listener: () => void): () => void {
            resetListeners.add(listener);

            return () => {
                resetListeners.delete(listener);
            };
        },
        addRuntimeContext,
        runtimeContexts(filter: chrome.runtime.ContextFilter = {}): chrome.runtime.ExtensionContext[] {
            if (Object.hasOwn(filter, "kinds")) fail('unsupported runtime context filter "kinds"; use contexts.list()');

            return list(filter).flatMap(({kind: _kind, url: _url, contextType, ...info}) =>
                contextType === undefined ? [] : [{...info, contextType}]
            );
        },
        setRuntimeContexts(values: readonly chrome.runtime.ExtensionContext[]): void {
            assertWritable();
            // Validate the complete replacement before removing subscriptions or state.
            const ids = new Set<string>();
            const preparedDocuments = new Map(documents);

            for (const value of values) {
                if (!value.contextId || ids.has(value.contextId) || !runtimeTypes.has(value.contextType)) fail("invalid runtime context replacement");

                ids.add(value.contextId);

                if (contexts.get(value.contextId)?.info.kind === "contentScript") fail("runtime context ID collides with a content script");
            }

            const copies = values.map(value => prepareRuntimeContext(value, preparedDocuments));
            replacing = true;

            try {
                removeContexts([...contexts].filter(([, {info}]) => info.kind !== "contentScript").map(([id]) => id));
            } finally {
                replacing = false;

                for (const [id, document] of preparedDocuments) documents.set(id, document);

                for (const value of copies) register(value);
            }
        },
        removeTab(tabId: number): void {
            const ids = new Set([...documents.values()].filter(value => value.tabId === tabId).map(value => value.documentId));

            for (const id of ids) documents.delete(id);

            removeContexts([...contexts].filter(([, {info}]) => info.tabId === tabId || (info.documentId && ids.has(info.documentId))).map(([id]) => id));
        },
    };
};
