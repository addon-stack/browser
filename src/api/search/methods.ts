import {browser} from "../browser";
import {callWithPromise} from "../utils";

import type {SearchEngine, SearchTargetOptions} from "./types";

const search = () => browser().search;

export const querySearch = (options: chrome.search.QueryInfo): Promise<void> =>
    callWithPromise(cb => search().query(options, cb));

// Firefox's get/search methods are Promise-only; do not pass a callback.
export const getSearchEngines = async (): Promise<SearchEngine[]> => search().get();

export const searchWithEngine = async (text: string, engine: string, options: SearchTargetOptions = {}): Promise<void> =>
    search().search({...options, query: text, engine});

export const canQuerySearch = (): boolean => {
    try {
        return typeof search()?.query === "function";
    } catch {
        return false;
    }
};

export const canGetSearchEngines = (): boolean => {
    try {
        return typeof search()?.get === "function";
    } catch {
        return false;
    }
};

export const canSearchWithEngine = (): boolean => {
    try {
        return typeof search()?.search === "function";
    } catch {
        return false;
    }
};

export const searchInTab = (text: string, tabId: number): Promise<void> => querySearch({text, tabId});

export const searchInCurrentTab = (text: string): Promise<void> => querySearch({text, disposition: "CURRENT_TAB"});

export const searchInNewTab = (text: string): Promise<void> => querySearch({text, disposition: "NEW_TAB"});

export const searchInNewWindow = (text: string): Promise<void> => querySearch({text, disposition: "NEW_WINDOW"});

export const getDefaultSearchEngine = async (): Promise<SearchEngine | undefined> =>
    (await getSearchEngines()).find(engine => engine.isDefault);

export const hasSearchEngine = async (name: string): Promise<boolean> => {
    try {
        return (await getSearchEngines()).some(engine => engine.name === name);
    } catch {
        return false;
    }
};
