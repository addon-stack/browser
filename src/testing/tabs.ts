import {type BrowserEventHarness, createBrowserEvent} from "./event";
import {createTabFixture} from "./fixtures";
import {missingEntityError} from "./internal";
import {createUrlMatcher} from "./match-patterns";
import {type BrowserMethod, createBrowserMethod} from "./method";
import type {BrowserMemoryState} from "./browser-state";
import type {RuntimeLastErrorController, TabsTestApi} from "./types";

type ListenerArgs<TEvent extends {addListener(listener: (...args: never[]) => unknown, ...args: never[]): unknown}> =
    Parameters<Parameters<TEvent["addListener"]>[0]>;

export interface TabsEventsHarness {
    onActivated: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onActivated>>;
    onAttached: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onAttached>>;
    onCreated: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onCreated>>;
    onDetached: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onDetached>>;
    onHighlighted: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onHighlighted>>;
    onMoved: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onMoved>>;
    onRemoved: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onRemoved>>;
    onReplaced: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onReplaced>>;
    onUpdated: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onUpdated>>;
    onZoomChange: BrowserEventHarness<ListenerArgs<typeof chrome.tabs.onZoomChange>>;
}

export interface TabsHarness {
    readonly api: TabsTestApi;
    readonly captureVisibleTab: BrowserMethod<typeof chrome.tabs.captureVisibleTab, string>;
    readonly connect: BrowserMethod<typeof chrome.tabs.connect, chrome.runtime.Port>;
    readonly create: BrowserMethod<typeof chrome.tabs.create, chrome.tabs.Tab>;
    readonly detectLanguage: BrowserMethod<typeof chrome.tabs.detectLanguage, string>;
    readonly discard: BrowserMethod<typeof chrome.tabs.discard, chrome.tabs.Tab | undefined>;
    readonly duplicate: BrowserMethod<typeof chrome.tabs.duplicate, chrome.tabs.Tab | undefined>;
    readonly executeScript: BrowserMethod<typeof chrome.tabs.executeScript, unknown[] | undefined>;
    readonly get: BrowserMethod<typeof chrome.tabs.get, chrome.tabs.Tab>;
    readonly getCurrent: BrowserMethod<typeof chrome.tabs.getCurrent, chrome.tabs.Tab | undefined>;
    readonly getZoom: BrowserMethod<typeof chrome.tabs.getZoom, number>;
    readonly getZoomSettings: BrowserMethod<typeof chrome.tabs.getZoomSettings, chrome.tabs.ZoomSettings>;
    readonly goBack: BrowserMethod<typeof chrome.tabs.goBack, void>;
    readonly goForward: BrowserMethod<typeof chrome.tabs.goForward, void>;
    readonly group: BrowserMethod<typeof chrome.tabs.group, number>;
    readonly highlight: BrowserMethod<typeof chrome.tabs.highlight, chrome.windows.Window>;
    readonly insertCSS: BrowserMethod<typeof chrome.tabs.insertCSS, void>;
    readonly move: BrowserMethod<typeof chrome.tabs.move, chrome.tabs.Tab | chrome.tabs.Tab[]>;
    readonly query: BrowserMethod<typeof chrome.tabs.query, chrome.tabs.Tab[]>;
    readonly reload: BrowserMethod<typeof chrome.tabs.reload, void>;
    readonly remove: BrowserMethod<typeof chrome.tabs.remove, void>;
    readonly removeCSS: BrowserMethod<typeof chrome.tabs.removeCSS, void>;
    readonly sendMessage: BrowserMethod<typeof chrome.tabs.sendMessage, unknown>;
    readonly setZoom: BrowserMethod<typeof chrome.tabs.setZoom, void>;
    readonly setZoomSettings: BrowserMethod<typeof chrome.tabs.setZoomSettings, void>;
    readonly ungroup: BrowserMethod<typeof chrome.tabs.ungroup, void>;
    readonly update: BrowserMethod<typeof chrome.tabs.update, chrome.tabs.Tab | undefined>;
    readonly events: TabsEventsHarness;
    readonly values: readonly chrome.tabs.Tab[];
    set(tabs: readonly chrome.tabs.Tab[]): void;
    reset(): void;
}

const supportedQueryFields = new Set([
    "active",
    "audible",
    "autoDiscardable",
    "currentWindow",
    "discarded",
    "frozen",
    "groupId",
    "highlighted",
    "index",
    "lastFocusedWindow",
    "muted",
    "pinned",
    "splitViewId",
    "status",
    "title",
    "url",
    "windowId",
    "windowType",
]);

const assertExactPattern = (field: "title", value: string): void => {
    if (value === "<all_urls>" || value.includes("*")) {
        throw new Error(`tabs.query ${field} match patterns are not supported; use an exact value`);
    }
};

const ignoreAutoEventError = (promise: Promise<void>): void => {
    promise.catch(() => undefined);
};

export const createTabsHarness = (
    state: BrowserMemoryState,
    lastError: RuntimeLastErrorController,
    nextSequence?: () => number
): TabsHarness => {
    const events: TabsEventsHarness = {
        onActivated: createBrowserEvent(),
        onAttached: createBrowserEvent(),
        onCreated: createBrowserEvent(),
        onDetached: createBrowserEvent(),
        onHighlighted: createBrowserEvent(),
        onMoved: createBrowserEvent(),
        onRemoved: createBrowserEvent(),
        onReplaced: createBrowserEvent(),
        onUpdated: createBrowserEvent(),
        onZoomChange: createBrowserEvent(),
    };

    const captureVisibleTab = createBrowserMethod<typeof chrome.tabs.captureVisibleTab, string>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.captureVisibleTab",
        nextSequence,
    });
    const connect = createBrowserMethod<typeof chrome.tabs.connect, chrome.runtime.Port>({
        invocation: "sync",
        name: "tabs.connect",
        nextSequence,
    });
    const create = createBrowserMethod<typeof chrome.tabs.create, chrome.tabs.Tab>({
        callback: "last",
        implementation: ((properties: chrome.tabs.CreateProperties, callback?: (tab: chrome.tabs.Tab) => void) => {
            const window = state.ensureWindow(properties.windowId);
            const windowId = window.id as number;
            const id = state.nextTabId();
            const existing = [...state.tabs.values()].filter(tab => tab.windowId === windowId);
            const index = properties.index ?? existing.length;

            for (const tab of existing) {
                if (tab.index >= index) tab.index += 1;
                if (properties.active !== false) tab.active = false;
            }

            const tab = createTabFixture({
                active: properties.active ?? true,
                highlighted: properties.active ?? true,
                id,
                index,
                openerTabId: properties.openerTabId,
                pinned: properties.pinned ?? false,
                selected: properties.active ?? true,
                url: properties.url,
                windowId,
            });
            state.tabs.set(id, tab);
            state.reindexTabs(windowId);
            const result = state.cloneTab(tab);
            callback?.(result);
            ignoreAutoEventError(events.onCreated.emit(state.cloneTab(tab)));
            if (tab.active) {
                ignoreAutoEventError(events.onActivated.emit({tabId: id, windowId}));
            }
            return result;
        }) as unknown as typeof chrome.tabs.create,
        invocation: "dual",
        lastError,
        name: "tabs.create",
        nextSequence,
    });
    const detectLanguage = createBrowserMethod<typeof chrome.tabs.detectLanguage, string>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.detectLanguage",
        nextSequence,
    });
    const discard = createBrowserMethod<typeof chrome.tabs.discard, chrome.tabs.Tab | undefined>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.discard",
        nextSequence,
    });
    const duplicate = createBrowserMethod<typeof chrome.tabs.duplicate, chrome.tabs.Tab | undefined>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.duplicate",
        nextSequence,
    });
    const executeScript = createBrowserMethod<typeof chrome.tabs.executeScript, unknown[] | undefined>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.executeScript",
        nextSequence,
    });
    const get = createBrowserMethod<typeof chrome.tabs.get, chrome.tabs.Tab>({
        callback: "last",
        implementation: ((tabId: number, callback?: (tab: chrome.tabs.Tab) => void) => {
            const tab = state.tabs.get(tabId);
            if (!tab) {
                const error = missingEntityError("tab", tabId);
                if (callback) {
                    lastError.runWithLastError(error, () => callback(undefined as unknown as chrome.tabs.Tab));
                    return undefined;
                }
                throw error;
            }
            const result = state.cloneTab(tab);
            callback?.(result);
            return result;
        }) as unknown as typeof chrome.tabs.get,
        invocation: "dual",
        lastError,
        name: "tabs.get",
        nextSequence,
    });
    const getCurrent = createBrowserMethod<typeof chrome.tabs.getCurrent, chrome.tabs.Tab | undefined>({
        callback: "last",
        implementation: ((callback?: (tab?: chrome.tabs.Tab) => void) => {
            const windowId = state.currentWindowId();
            const tab = [...state.tabs.values()].find(item => item.windowId === windowId && item.active);
            const result = tab ? state.cloneTab(tab) : undefined;
            callback?.(result);
            return result;
        }) as unknown as typeof chrome.tabs.getCurrent,
        invocation: "dual",
        lastError,
        name: "tabs.getCurrent",
        nextSequence,
    });
    const getZoom = createBrowserMethod<typeof chrome.tabs.getZoom, number>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.getZoom",
        nextSequence,
    });
    const getZoomSettings = createBrowserMethod<typeof chrome.tabs.getZoomSettings, chrome.tabs.ZoomSettings>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.getZoomSettings",
        nextSequence,
    });
    const goBack = createBrowserMethod<typeof chrome.tabs.goBack, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.goBack",
        nextSequence,
    });
    const goForward = createBrowserMethod<typeof chrome.tabs.goForward, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.goForward",
        nextSequence,
    });
    const group = createBrowserMethod<typeof chrome.tabs.group, number>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.group",
        nextSequence,
    });
    const highlight = createBrowserMethod<typeof chrome.tabs.highlight, chrome.windows.Window>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.highlight",
        nextSequence,
    });
    const insertCSS = createBrowserMethod<typeof chrome.tabs.insertCSS, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.insertCSS",
        nextSequence,
    });
    const move = createBrowserMethod<typeof chrome.tabs.move, chrome.tabs.Tab | chrome.tabs.Tab[]>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.move",
        nextSequence,
    });
    const query = createBrowserMethod<typeof chrome.tabs.query, chrome.tabs.Tab[]>({
        callback: "last",
        implementation: ((queryInfo: chrome.tabs.QueryInfo, callback?: (tabs: chrome.tabs.Tab[]) => void) => {
            for (const key of Object.keys(queryInfo)) {
                if (!supportedQueryFields.has(key)) throw new Error(`tabs.query filter "${key}" is not supported`);
            }

            const urls = typeof queryInfo.url === "string" ? [queryInfo.url] : queryInfo.url;
            const matchesUrl = urls === undefined ? undefined : createUrlMatcher(urls, "tabs.query");
            if (queryInfo.title) assertExactPattern("title", queryInfo.title);

            const currentWindowId = state.currentWindowId();
            const requestedWindowId = queryInfo.windowId === -2 ? currentWindowId : queryInfo.windowId;
            const result = [...state.tabs.values()]
                .filter(tab => {
                    const window = state.windows.get(tab.windowId);
                    if (queryInfo.status !== undefined && tab.status !== queryInfo.status) return false;
                    if (
                        queryInfo.lastFocusedWindow !== undefined &&
                        (tab.windowId === state.lastFocusedWindowId) !== queryInfo.lastFocusedWindow
                    )
                        return false;
                    if (requestedWindowId !== undefined && tab.windowId !== requestedWindowId) return false;
                    if (queryInfo.windowType !== undefined && window?.type !== queryInfo.windowType) return false;
                    if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
                    if (queryInfo.index !== undefined && tab.index !== queryInfo.index) return false;
                    if (
                        queryInfo.currentWindow !== undefined &&
                        (tab.windowId === currentWindowId) !== queryInfo.currentWindow
                    )
                        return false;
                    if (queryInfo.highlighted !== undefined && tab.highlighted !== queryInfo.highlighted) return false;
                    if (queryInfo.discarded !== undefined && tab.discarded !== queryInfo.discarded) return false;
                    if (queryInfo.frozen !== undefined && tab.frozen !== queryInfo.frozen) return false;
                    if (queryInfo.autoDiscardable !== undefined && tab.autoDiscardable !== queryInfo.autoDiscardable)
                        return false;
                    if (queryInfo.pinned !== undefined && tab.pinned !== queryInfo.pinned) return false;
                    if (queryInfo.splitViewId !== undefined && tab.splitViewId !== queryInfo.splitViewId) return false;
                    if (queryInfo.audible !== undefined && Boolean(tab.audible) !== queryInfo.audible) return false;
                    if (queryInfo.muted !== undefined && Boolean(tab.mutedInfo?.muted) !== queryInfo.muted)
                        return false;
                    if (queryInfo.groupId !== undefined && tab.groupId !== queryInfo.groupId) return false;
                    if (queryInfo.title !== undefined && tab.title !== queryInfo.title) return false;
                    if (matchesUrl && (!tab.url || !matchesUrl(tab.url))) return false;
                    return true;
                })
                .sort((left, right) => left.windowId - right.windowId || left.index - right.index)
                .map(tab => state.cloneTab(tab));

            callback?.(result);
            return result;
        }) as unknown as typeof chrome.tabs.query,
        invocation: "dual",
        lastError,
        name: "tabs.query",
        nextSequence,
    });
    const reload = createBrowserMethod<typeof chrome.tabs.reload, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.reload",
        nextSequence,
    });
    const remove = createBrowserMethod<typeof chrome.tabs.remove, void>({
        callback: "last",
        callbackArgs: () => [],
        implementation: ((ids: number | number[], callback?: () => void) => {
            const tabIds = Array.isArray(ids) ? ids : [ids];
            const missingId = tabIds.find(id => !state.tabs.has(id));
            if (typeof missingId === "number") {
                const error = missingEntityError("tab", missingId);
                if (callback) {
                    lastError.runWithLastError(error, callback);
                    return;
                }
                throw error;
            }

            for (const id of tabIds) {
                const tab = state.tabs.get(id);
                if (!tab) continue;
                state.tabs.delete(id);
                state.reindexTabs(tab.windowId);
                ignoreAutoEventError(events.onRemoved.emit(id, {isWindowClosing: false, windowId: tab.windowId}));
            }
            callback?.();
        }) as typeof chrome.tabs.remove,
        invocation: "dual",
        lastError,
        name: "tabs.remove",
        nextSequence,
    });
    const removeCSS = createBrowserMethod<typeof chrome.tabs.removeCSS, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.removeCSS",
        nextSequence,
    });
    const sendMessage = createBrowserMethod<typeof chrome.tabs.sendMessage, unknown>({
        callback: "last",
        invocation: "dual",
        lastError,
        name: "tabs.sendMessage",
        nextSequence,
    });
    const setZoom = createBrowserMethod<typeof chrome.tabs.setZoom, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.setZoom",
        nextSequence,
    });
    const setZoomSettings = createBrowserMethod<typeof chrome.tabs.setZoomSettings, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.setZoomSettings",
        nextSequence,
    });
    const ungroup = createBrowserMethod<typeof chrome.tabs.ungroup, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "tabs.ungroup",
        nextSequence,
    });
    const update = createBrowserMethod<typeof chrome.tabs.update, chrome.tabs.Tab | undefined>({
        callback: "last",
        implementation: ((
            tabId: number,
            properties: chrome.tabs.UpdateProperties,
            callback?: (tab?: chrome.tabs.Tab) => void
        ) => {
            const tab = state.tabs.get(tabId);
            if (!tab) {
                const error = missingEntityError("tab", tabId);
                if (callback) {
                    lastError.runWithLastError(error, () => callback(undefined));
                    return undefined;
                }
                throw error;
            }
            if (properties.active) {
                for (const other of state.tabs.values()) {
                    if (other.windowId === tab.windowId) other.active = other.id === tab.id;
                }
            }
            Object.assign(tab, properties);
            if (typeof properties.highlighted === "boolean") tab.selected = properties.highlighted;
            const result = state.cloneTab(tab);
            callback?.(result);
            ignoreAutoEventError(events.onUpdated.emit(tabId, {...properties}, state.cloneTab(tab)));
            if (properties.active) {
                ignoreAutoEventError(events.onActivated.emit({tabId, windowId: tab.windowId}));
            }
            return result;
        }) as unknown as typeof chrome.tabs.update,
        invocation: "dual",
        lastError,
        name: "tabs.update",
        nextSequence,
    });

    const api = {
        captureVisibleTab: captureVisibleTab.api,
        connect: connect.api,
        create: create.api,
        detectLanguage: detectLanguage.api,
        discard: discard.api,
        duplicate: duplicate.api,
        executeScript: executeScript.api,
        get: get.api,
        getCurrent: getCurrent.api,
        getZoom: getZoom.api,
        getZoomSettings: getZoomSettings.api,
        goBack: goBack.api,
        goForward: goForward.api,
        group: group.api,
        highlight: highlight.api,
        insertCSS: insertCSS.api,
        move: move.api,
        onActivated: events.onActivated.api,
        onAttached: events.onAttached.api,
        onCreated: events.onCreated.api,
        onDetached: events.onDetached.api,
        onHighlighted: events.onHighlighted.api,
        onMoved: events.onMoved.api,
        onRemoved: events.onRemoved.api,
        onReplaced: events.onReplaced.api,
        onUpdated: events.onUpdated.api,
        onZoomChange: events.onZoomChange.api,
        query: query.api,
        reload: reload.api,
        remove: remove.api,
        removeCSS: removeCSS.api,
        sendMessage: sendMessage.api,
        setZoom: setZoom.api,
        setZoomSettings: setZoomSettings.api,
        ungroup: ungroup.api,
        update: update.api,
    } as unknown as TabsTestApi;

    const methods = [
        captureVisibleTab,
        connect,
        create,
        detectLanguage,
        discard,
        duplicate,
        executeScript,
        get,
        getCurrent,
        getZoom,
        getZoomSettings,
        goBack,
        goForward,
        group,
        highlight,
        insertCSS,
        move,
        query,
        reload,
        remove,
        removeCSS,
        sendMessage,
        setZoom,
        setZoomSettings,
        ungroup,
        update,
    ];

    return {
        api,
        captureVisibleTab,
        connect,
        create,
        detectLanguage,
        discard,
        duplicate,
        executeScript,
        get,
        getCurrent,
        getZoom,
        getZoomSettings,
        goBack,
        goForward,
        group,
        highlight,
        insertCSS,
        move,
        query,
        reload,
        remove,
        removeCSS,
        sendMessage,
        setZoom,
        setZoomSettings,
        ungroup,
        update,
        events,
        get values() {
            return [...state.tabs.values()]
                .sort((left, right) => left.windowId - right.windowId || left.index - right.index)
                .map(tab => state.cloneTab(tab));
        },
        reset(): void {
            methods.forEach(method => {
                method.reset();
            });
            Object.values(events).forEach(event => {
                event.reset();
            });
        },
        set(tabs): void {
            state.tabs.clear();
            for (const tab of tabs) {
                if (typeof tab.id !== "number") throw new Error("A test tab must have a numeric id");
                state.ensureWindow(tab.windowId);
                state.tabs.set(tab.id, state.cloneTab(tab));
            }
            for (const windowId of new Set(tabs.map(tab => tab.windowId))) state.reindexTabs(windowId);
        },
    };
};
