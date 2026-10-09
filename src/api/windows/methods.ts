import {browser} from "../browser";
import {callWithPromise} from "../utils";

type Window = chrome.windows.Window;
type CreateData = chrome.windows.CreateData;
type UpdateInfo = chrome.windows.UpdateInfo;
type QueryOptions = chrome.windows.QueryOptions;

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
