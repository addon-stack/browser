import {createWindowFixture} from "./fixtures";
import {cloneRecord} from "./internal";

export interface BrowserMemoryStateOptions {
    tabs?: readonly chrome.tabs.Tab[];
    windows?: readonly chrome.windows.Window[];
}

export interface BrowserMemoryState {
    readonly tabs: Map<number, chrome.tabs.Tab>;
    readonly windows: Map<number, chrome.windows.Window>;
    readonly lastFocusedWindowId: number | undefined;
    reset(): void;
    nextTabId(): number;
    nextWindowId(): number;
    currentWindowId(): number | undefined;
    setLastFocusedWindow(id: number | undefined): void;
    cloneTab(tab: chrome.tabs.Tab): chrome.tabs.Tab;
    cloneWindow(window: chrome.windows.Window, populate?: boolean): chrome.windows.Window;
    reindexTabs(windowId: number): void;
    ensureWindow(windowId?: number): chrome.windows.Window;
}

export const createBrowserMemoryState = (options: BrowserMemoryStateOptions): BrowserMemoryState => {
    const initialWindows = (options.windows ?? []).map(window => cloneRecord(window));
    const nestedTabs = initialWindows.flatMap(window =>
        typeof window.id === "number"
            ? (window.tabs ?? []).map(tab => cloneRecord({...tab, windowId: window.id as number}))
            : []
    );
    const initialTabs = [...nestedTabs, ...(options.tabs ?? [])].map(tab => cloneRecord(tab));
    let tabs = new Map<number, chrome.tabs.Tab>();
    let windows = new Map<number, chrome.windows.Window>();
    let tabCounter = 0;
    let windowCounter = 0;
    let lastFocusedWindowId: number | undefined;

    const reset = (): void => {
        tabs = new Map();
        windows = new Map();

        for (const window of initialWindows) {
            if (typeof window.id !== "number") continue;
            const copy = cloneRecord(window);
            delete copy.tabs;
            windows.set(window.id, copy);
        }
        for (const tab of initialTabs) {
            if (typeof tab.id !== "number") continue;
            tabs.set(tab.id, cloneRecord(tab));
            if (!windows.has(tab.windowId)) {
                windows.set(tab.windowId, createWindowFixture({focused: false, id: tab.windowId, tabs: undefined}));
            }
        }

        tabCounter = Math.max(0, ...tabs.keys());
        windowCounter = Math.max(0, ...windows.keys());
        lastFocusedWindowId = [...windows.values()].find(window => window.focused)?.id ?? [...windows.keys()][0];
    };

    const state: BrowserMemoryState = {
        get tabs() {
            return tabs;
        },
        get windows() {
            return windows;
        },
        get lastFocusedWindowId() {
            return lastFocusedWindowId;
        },
        cloneTab(tab) {
            return cloneRecord(tab);
        },
        cloneWindow(window, populate = false) {
            const copy = cloneRecord(window);
            if (populate && typeof copy.id === "number") {
                copy.tabs = [...tabs.values()]
                    .filter(tab => tab.windowId === copy.id)
                    .sort((left, right) => left.index - right.index)
                    .map(tab => cloneRecord(tab));
            } else {
                delete copy.tabs;
            }
            return copy;
        },
        currentWindowId() {
            return (
                [...windows.values()].find(window => window.focused)?.id ??
                lastFocusedWindowId ??
                [...windows.keys()][0]
            );
        },
        ensureWindow(windowId) {
            const requestedId = windowId ?? state.currentWindowId();
            if (typeof requestedId === "number") {
                const existing = windows.get(requestedId);
                if (existing) return existing;
            }

            const id = typeof windowId === "number" ? windowId : state.nextWindowId();
            const window = createWindowFixture({focused: windows.size === 0, id, tabs: undefined});
            windows.set(id, window);
            if (window.focused) lastFocusedWindowId = id;
            return window;
        },
        nextTabId() {
            do {
                tabCounter += 1;
            } while (tabs.has(tabCounter));
            return tabCounter;
        },
        nextWindowId() {
            do {
                windowCounter += 1;
            } while (windows.has(windowCounter));
            return windowCounter;
        },
        reindexTabs(windowId) {
            [...tabs.values()]
                .filter(tab => tab.windowId === windowId)
                .sort((left, right) => left.index - right.index)
                .forEach((tab, index) => {
                    tab.index = index;
                });
        },
        reset,
        setLastFocusedWindow(id) {
            lastFocusedWindowId = id;
        },
    };

    reset();
    return state;
};
