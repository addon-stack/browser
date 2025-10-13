import {browser} from "./browser";
import {throwRuntimeError} from "./runtime";
import {handleListener, safeListener} from "./utils";

type Window = chrome.windows.Window;
type WindowType = chrome.windows.WindowType;
type CreateData = chrome.windows.CreateData;
type UpdateInfo = chrome.windows.UpdateInfo;
type QueryOptions = chrome.windows.QueryOptions;

export interface WindowEventFilter {
    windowTypes: `${WindowType}`[];
}

const windows = () => browser().windows;

// Methods
export const createWindow = (createData?: CreateData): Promise<Window | undefined> =>
    new Promise<Window | undefined>((resolve, reject) => {
        windows().create(createData || {}, window => {
            try {
                throwRuntimeError();

                resolve(window);
            } catch (e) {
                reject(e);
            }
        });
    });

export const getWindow = (windowId: number, queryOptions?: QueryOptions): Promise<Window> =>
    new Promise<Window>((resolve, reject) => {
        windows().get(windowId, queryOptions || {}, window => {
            try {
                throwRuntimeError();

                resolve(window);
            } catch (e) {
                reject(e);
            }
        });
    });

export const getAllWindows = (queryOptions?: QueryOptions): Promise<Window[]> =>
    new Promise<Window[]>((resolve, reject) => {
        windows().getAll(queryOptions || {}, windows => {
            try {
                throwRuntimeError();

                resolve(windows);
            } catch (e) {
                reject(e);
            }
        });
    });

export const getCurrentWindow = (queryOptions?: QueryOptions): Promise<Window> =>
    new Promise<Window>((resolve, reject) => {
        windows().getCurrent(queryOptions || {}, window => {
            try {
                throwRuntimeError();

                resolve(window);
            } catch (e) {
                reject(e);
            }
        });
    });

export const getLastFocusedWindow = (queryOptions?: QueryOptions): Promise<Window> =>
    new Promise<Window>((resolve, reject) => {
        windows().getLastFocused(queryOptions || {}, window => {
            try {
                throwRuntimeError();

                resolve(window);
            } catch (e) {
                reject(e);
            }
        });
    });

export const removeWindow = (windowId: number): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        windows().remove(windowId, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const updateWindow = (windowId: number, updateInfo: UpdateInfo): Promise<Window> =>
    new Promise<Window>((resolve, reject) => {
        windows().update(windowId, updateInfo, window => {
            try {
                throwRuntimeError();

                resolve(window);
            } catch (e) {
                reject(e);
            }
        });
    });

// Events
export const onWindowBoundsChanged = (
    callback: Parameters<typeof chrome.windows.onBoundsChanged.addListener>[0]
): (() => void) => {
    return handleListener(windows().onBoundsChanged, callback);
};

export const onWindowCreated = (
    callback: Parameters<typeof chrome.windows.onCreated.addListener>[0],
    filter?: WindowEventFilter
): (() => void) => {
    const listener = safeListener(callback);

    const args: Parameters<typeof chrome.windows.onCreated.addListener> = [listener];

    if (filter) args.push(filter);

    windows().onCreated.addListener(...args);

    return () => windows().onCreated.removeListener(listener);
};

export const onWindowFocusChanged = (
    callback: Parameters<typeof chrome.windows.onFocusChanged.addListener>[0],
    filter?: WindowEventFilter
): (() => void) => {
    const listener = safeListener(callback);

    const args: Parameters<typeof chrome.windows.onFocusChanged.addListener> = [listener];

    if (filter) args.push(filter);

    windows().onFocusChanged.addListener(...args);

    return () => windows().onFocusChanged.removeListener(listener);
};

export const onWindowRemoved = (
    callback: Parameters<typeof chrome.windows.onRemoved.addListener>[0],
    filter?: WindowEventFilter
): (() => void) => {
    const listener = safeListener(callback);

    const args: Parameters<typeof chrome.windows.onRemoved.addListener> = [listener];

    if (filter) args.push(filter);

    windows().onRemoved.addListener(...args);

    return () => windows().onRemoved.removeListener(listener);
};
