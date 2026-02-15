import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type UrlDetails = chrome.history.UrlDetails;
type Range = chrome.history.Range;
type VisitItem = chrome.history.VisitItem;
type HistoryQuery = chrome.history.HistoryQuery;
type HistoryItem = chrome.history.HistoryItem;

const history = () => browser().history;

// Methods
export const addHistoryUrl = (url: string): Promise<void> => callWithPromise(cb => history().addUrl({url}, cb));

export const deleteAllHistory = (): Promise<void> => callWithPromise(cb => history().deleteAll(cb));

export const deleteRangeHistory = (range: Range): Promise<void> =>
    callWithPromise(cb => history().deleteRange(range, cb));

export const deleteHistoryUrl = (details: UrlDetails): Promise<void> =>
    callWithPromise(cb => history().deleteUrl(details, cb));

export const getHistoryVisits = (url: string): Promise<VisitItem[]> =>
    callWithPromise(cb => history().getVisits({url}, cb));

export const searchHistory = (query: HistoryQuery): Promise<HistoryItem[]> =>
    callWithPromise(cb => history().search(query, cb));

// Events
export const onHistoryVisited = (
    callback: Parameters<typeof chrome.history.onVisited.addListener>[0]
): (() => void) => {
    return handleListener(history().onVisited, callback);
};

export const onHistoryVisitRemoved = (
    callback: Parameters<typeof chrome.history.onVisitRemoved.addListener>[0]
): (() => void) => {
    return handleListener(history().onVisitRemoved, callback);
};
