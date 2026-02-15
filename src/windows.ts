import {browser} from "./browser";
import {callWithPromise, handleListener, safeListener} from "./utils";

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
    callWithPromise(cb => windows().create(createData || {}, cb));

export const getWindow = (windowId: number, queryOptions?: QueryOptions): Promise<Window> =>
    callWithPromise(cb => windows().get(windowId, queryOptions || {}, cb));

export const getAllWindows = (queryOptions?: QueryOptions): Promise<Window[]> =>
    callWithPromise(cb => windows().getAll(queryOptions || {}, cb));

export const getCurrentWindow = (queryOptions?: QueryOptions): Promise<Window> =>
    callWithPromise(cb => windows().getCurrent(queryOptions || {}, cb));

export const getLastFocusedWindow = (queryOptions?: QueryOptions): Promise<Window> =>
    callWithPromise(cb => windows().getLastFocused(queryOptions || {}, cb));

export const removeWindow = (windowId: number): Promise<void> =>
    callWithPromise(cb => windows().remove(windowId, () => cb()));

export const updateWindow = (windowId: number, updateInfo: UpdateInfo): Promise<Window> =>
    callWithPromise(cb => windows().update(windowId, updateInfo, cb));

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
