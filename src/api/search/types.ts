export type SearchEngine = chrome.search.SearchEngine;

/** A destination for search results. tabId and disposition are mutually exclusive. */
export type SearchTargetOptions =
    | {tabId?: number; disposition?: undefined}
    | {tabId?: undefined; disposition?: `${chrome.search.Disposition}`};
