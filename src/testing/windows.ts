import type {BrowserMemoryState} from "./browser-state";
import {type BrowserEventHarness, createBrowserEvent} from "./event";
import {createWindowFixture} from "./fixtures";
import {missingEntityError} from "./internal";
import {type BrowserMethod, createBrowserMethod} from "./method";
import type {TabsHarness} from "./tabs";
import type {RuntimeLastErrorController, WindowsTestApi} from "./types";

type ListenerArgs<TEvent extends {addListener(listener: (...args: never[]) => unknown, ...args: never[]): unknown}> =
    Parameters<Parameters<TEvent["addListener"]>[0]>;

type WindowEventRegistrationArgs = [filter?: {windowTypes: `${chrome.windows.WindowType}`[]}];

export interface WindowsEventsHarness {
    onBoundsChanged: BrowserEventHarness<ListenerArgs<typeof chrome.windows.onBoundsChanged>>;
    onCreated: BrowserEventHarness<ListenerArgs<typeof chrome.windows.onCreated>, WindowEventRegistrationArgs>;
    onFocusChanged: BrowserEventHarness<
        ListenerArgs<typeof chrome.windows.onFocusChanged>,
        WindowEventRegistrationArgs
    >;
    onRemoved: BrowserEventHarness<ListenerArgs<typeof chrome.windows.onRemoved>, WindowEventRegistrationArgs>;
}

export interface WindowsHarness {
    readonly api: WindowsTestApi;
    readonly create: BrowserMethod<typeof chrome.windows.create, chrome.windows.Window | undefined>;
    readonly get: BrowserMethod<typeof chrome.windows.get, chrome.windows.Window>;
    readonly getAll: BrowserMethod<typeof chrome.windows.getAll, chrome.windows.Window[]>;
    readonly getCurrent: BrowserMethod<typeof chrome.windows.getCurrent, chrome.windows.Window>;
    readonly getLastFocused: BrowserMethod<typeof chrome.windows.getLastFocused, chrome.windows.Window>;
    readonly remove: BrowserMethod<typeof chrome.windows.remove, void>;
    readonly update: BrowserMethod<typeof chrome.windows.update, chrome.windows.Window>;
    readonly events: WindowsEventsHarness;
    readonly values: readonly chrome.windows.Window[];
    set(windows: readonly chrome.windows.Window[]): void;
    reset(): void;
}

const ignoreAutoEventError = (promise: Promise<void>): void => {
    promise.catch(() => undefined);
};

export const createWindowsHarness = (
    state: BrowserMemoryState,
    tabs: TabsHarness,
    lastError: RuntimeLastErrorController,
    nextSequence?: () => number
): WindowsHarness => {
    const events: WindowsEventsHarness = {
        onBoundsChanged: createBrowserEvent(),
        onCreated: createBrowserEvent(),
        onFocusChanged: createBrowserEvent(),
        onRemoved: createBrowserEvent(),
    };

    const resolveWindow = (
        windowId: number,
        populate: boolean,
        callback?: (window: chrome.windows.Window) => void
    ): chrome.windows.Window | undefined => {
        const actualId = windowId === -2 ? state.currentWindowId() : windowId;
        const window = typeof actualId === "number" ? state.windows.get(actualId) : undefined;

        if (!window) {
            const error = missingEntityError("window", windowId);

            if (callback) {
                lastError.runWithLastError(error, () => callback(undefined as unknown as chrome.windows.Window));

                return undefined;
            }

            throw error;
        }

        const result = state.cloneWindow(window, populate);
        callback?.(result);

        return result;
    };

    const create = createBrowserMethod<typeof chrome.windows.create, chrome.windows.Window | undefined>({
        callback: "last",
        implementation: (async (
            createData: chrome.windows.CreateData = {},
            callback?: (window?: chrome.windows.Window) => void
        ) => {
            const id = state.nextWindowId();
            const focused = createData.focused ?? true;

            if (focused) {
                for (const existing of state.windows.values()) existing.focused = false;
            }

            const window = createWindowFixture({
                focused,
                height: createData.height,
                id,
                incognito: createData.incognito ?? false,
                left: createData.left,
                state: createData.state ?? "normal",
                tabs: undefined,
                top: createData.top,
                type: (createData.type ?? "normal") as `${chrome.windows.WindowType}`,
                width: createData.width,
            });

            state.windows.set(id, window);

            if (focused) state.setLastFocusedWindow(id);

            if (typeof createData.tabId === "number") {
                const tab = state.tabs.get(createData.tabId);

                if (tab) {
                    const oldWindowId = tab.windowId;
                    tab.windowId = id;
                    tab.index = 0;
                    state.reindexTabs(oldWindowId);
                }
            }

            const urls = typeof createData.url === "string" ? [createData.url] : createData.url;

            for (const [index, url] of (urls ?? []).entries()) {
                await tabs.create.api({active: index === 0, index, url, windowId: id});
            }

            const result = state.cloneWindow(window, true);
            callback?.(result);
            ignoreAutoEventError(events.onCreated.emit(state.cloneWindow(window, true)));

            if (focused) ignoreAutoEventError(events.onFocusChanged.emit(id));

            return result;
        }) as unknown as typeof chrome.windows.create,
        invocation: "dual",
        lastError,
        name: "windows.create",
        nextSequence,
    });

    const get = createBrowserMethod<typeof chrome.windows.get, chrome.windows.Window>({
        callback: "last",
        implementation: ((
            windowId: number,
            queryOrCallback?: chrome.windows.QueryOptions | ((window: chrome.windows.Window) => void),
            possibleCallback?: (window: chrome.windows.Window) => void
        ) => {
            const query = typeof queryOrCallback === "function" ? {} : (queryOrCallback ?? {});
            const callback = typeof queryOrCallback === "function" ? queryOrCallback : possibleCallback;

            return resolveWindow(windowId, query.populate ?? false, callback);
        }) as unknown as typeof chrome.windows.get,
        invocation: "dual",
        lastError,
        name: "windows.get",
        nextSequence,
    });

    const getAll = createBrowserMethod<typeof chrome.windows.getAll, chrome.windows.Window[]>({
        callback: "last",
        implementation: ((
            queryOrCallback?: chrome.windows.QueryOptions | ((windows: chrome.windows.Window[]) => void),
            possibleCallback?: (windows: chrome.windows.Window[]) => void
        ) => {
            const query = typeof queryOrCallback === "function" ? {} : (queryOrCallback ?? {});
            const callback = typeof queryOrCallback === "function" ? queryOrCallback : possibleCallback;

            const result = [...state.windows.values()]
                .filter(window => !query.windowTypes || (window.type && query.windowTypes.includes(window.type)))
                .map(window => state.cloneWindow(window, query.populate ?? false));

            callback?.(result);

            return result;
        }) as unknown as typeof chrome.windows.getAll,
        invocation: "dual",
        lastError,
        name: "windows.getAll",
        nextSequence,
    });

    const getCurrent = createBrowserMethod<typeof chrome.windows.getCurrent, chrome.windows.Window>({
        callback: "last",
        implementation: ((
            queryOrCallback?: chrome.windows.QueryOptions | ((window: chrome.windows.Window) => void),
            possibleCallback?: (window: chrome.windows.Window) => void
        ) => {
            const query = typeof queryOrCallback === "function" ? {} : (queryOrCallback ?? {});
            const callback = typeof queryOrCallback === "function" ? queryOrCallback : possibleCallback;

            return resolveWindow(state.currentWindowId() ?? -1, query.populate ?? false, callback);
        }) as unknown as typeof chrome.windows.getCurrent,
        invocation: "dual",
        lastError,
        name: "windows.getCurrent",
        nextSequence,
    });

    const getLastFocused = createBrowserMethod<typeof chrome.windows.getLastFocused, chrome.windows.Window>({
        callback: "last",
        implementation: ((
            queryOrCallback?: chrome.windows.QueryOptions | ((window: chrome.windows.Window) => void),
            possibleCallback?: (window: chrome.windows.Window) => void
        ) => {
            const query = typeof queryOrCallback === "function" ? {} : (queryOrCallback ?? {});
            const callback = typeof queryOrCallback === "function" ? queryOrCallback : possibleCallback;

            return resolveWindow(state.lastFocusedWindowId ?? -1, query.populate ?? false, callback);
        }) as unknown as typeof chrome.windows.getLastFocused,
        invocation: "dual",
        lastError,
        name: "windows.getLastFocused",
        nextSequence,
    });

    const remove = createBrowserMethod<typeof chrome.windows.remove, void>({
        callback: "last",
        callbackArgs: () => [],
        implementation: ((windowId: number, callback?: () => void) => {
            const window = state.windows.get(windowId);

            if (!window) {
                const error = missingEntityError("window", windowId);

                if (callback) {
                    lastError.runWithLastError(error, callback);

                    return;
                }

                throw error;
            }

            const tabIds = [...state.tabs.values()].filter(tab => tab.windowId === windowId).map(tab => tab.id);
            state.windows.delete(windowId);

            for (const tabId of tabIds) {
                if (typeof tabId !== "number") continue;

                state.tabs.delete(tabId);
                ignoreAutoEventError(tabs.events.onRemoved.emit(tabId, {isWindowClosing: true, windowId}));
            }

            if (state.lastFocusedWindowId === windowId) {
                const nextWindow = [...state.windows.values()][0];

                if (nextWindow) nextWindow.focused = true;

                state.setLastFocusedWindow(nextWindow?.id);
            }

            callback?.();
            ignoreAutoEventError(events.onRemoved.emit(windowId));
        }) as typeof chrome.windows.remove,
        invocation: "dual",
        lastError,
        name: "windows.remove",
        nextSequence,
    });

    const update = createBrowserMethod<typeof chrome.windows.update, chrome.windows.Window>({
        callback: "last",
        implementation: ((
            windowId: number,
            updateInfo: chrome.windows.UpdateInfo,
            callback?: (window: chrome.windows.Window) => void
        ) => {
            const window = state.windows.get(windowId);

            if (!window) return resolveWindow(windowId, false, callback);

            if (updateInfo.focused) {
                for (const existing of state.windows.values()) existing.focused = existing.id === windowId;

                state.setLastFocusedWindow(windowId);
            } else if (updateInfo.focused === false) {
                window.focused = false;
            }

            Object.assign(window, updateInfo);
            const result = state.cloneWindow(window, false);
            callback?.(result);
            ignoreAutoEventError(events.onBoundsChanged.emit(state.cloneWindow(window)));

            if (typeof updateInfo.focused === "boolean") {
                ignoreAutoEventError(events.onFocusChanged.emit(updateInfo.focused ? windowId : -1));
            }

            return result;
        }) as unknown as typeof chrome.windows.update,
        invocation: "dual",
        lastError,
        name: "windows.update",
        nextSequence,
    });

    const api = {
        WINDOW_ID_CURRENT: -2,
        WINDOW_ID_NONE: -1,
        create: create.api,
        get: get.api,
        getAll: getAll.api,
        getCurrent: getCurrent.api,
        getLastFocused: getLastFocused.api,
        onBoundsChanged: events.onBoundsChanged.api,
        onCreated: events.onCreated.api,
        onFocusChanged: events.onFocusChanged.api,
        onRemoved: events.onRemoved.api,
        remove: remove.api,
        update: update.api,
    } as unknown as WindowsTestApi;

    const methods = [create, get, getAll, getCurrent, getLastFocused, remove, update];

    return {
        api,
        create,
        get,
        getAll,
        getCurrent,
        getLastFocused,
        remove,
        update,
        events,
        get values() {
            return [...state.windows.values()].map(window => state.cloneWindow(window, true));
        },
        reset(): void {
            methods.forEach(method => {
                method.reset();
            });

            Object.values(events).forEach(event => {
                event.reset();
            });
        },
        set(windows): void {
            const replacementWindowIds = new Set(
                windows.flatMap(window => (typeof window.id === "number" ? [window.id] : []))
            );

            const windowsWithExplicitTabs = new Set(
                windows.flatMap(window =>
                    typeof window.id === "number" && Array.isArray(window.tabs) ? [window.id] : []
                )
            );

            for (const [tabId, tab] of state.tabs) {
                if (!replacementWindowIds.has(tab.windowId) || windowsWithExplicitTabs.has(tab.windowId)) {
                    state.tabs.delete(tabId);
                }
            }

            state.windows.clear();

            for (const window of windows) {
                if (typeof window.id !== "number") throw new Error("A test window must have a numeric id");

                const copy = state.cloneWindow(window);
                delete copy.tabs;
                state.windows.set(window.id, copy);

                for (const tab of window.tabs ?? []) {
                    if (typeof tab.id !== "number") throw new Error("A test tab must have a numeric id");

                    state.tabs.set(tab.id, state.cloneTab({...tab, windowId: window.id}));
                }

                state.reindexTabs(window.id);
            }

            state.setLastFocusedWindow(
                [...state.windows.values()].find(window => window.focused)?.id ?? [...state.windows.keys()][0]
            );
        },
    };
};
