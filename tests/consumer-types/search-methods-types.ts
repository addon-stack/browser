import {
    canGetSearchEngines,
    canQuerySearch,
    canSearchWithEngine,
    getDefaultSearchEngine,
    getSearchEngines,
    hasSearchEngine,
    isAvailableSearch,
    querySearch,
    type SearchEngine,
    searchInCurrentTab,
    searchInNewTab,
    searchInNewWindow,
    searchInTab,
    type SearchTargetOptions,
    searchWithEngine,
} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const exactQuery: Equal<typeof querySearch, (options: chrome.search.QueryInfo) => Promise<void>> = true;
const exactEngines: Equal<ReturnType<typeof getSearchEngines>, Promise<SearchEngine[]>> = true;
const exactDefault: Equal<ReturnType<typeof getDefaultSearchEngine>, Promise<SearchEngine | undefined>> = true;
const exactHas: Equal<ReturnType<typeof hasSearchEngine>, Promise<boolean>> = true;
void [exactQuery, exactEngines, exactDefault, exactHas];

const engine: SearchEngine = {name: "Example", isDefault: true};
const target: SearchTargetOptions = {tabId: 0};

const operations: Promise<void>[] = [
    querySearch({text: "hello"}),
    querySearch({text: "hello", tabId: 0}),
    querySearch({text: "hello", disposition: "NEW_TAB"}),
    searchWithEngine("hello", engine.name),
    searchWithEngine("hello", engine.name, target),
    searchWithEngine("hello", engine.name, {disposition: "CURRENT_TAB"}),
    searchInTab("hello", 0),
    searchInCurrentTab("hello"),
    searchInNewTab("hello"),
    searchInNewWindow("hello"),
];

void operations;

for (const check of [isAvailableSearch, canQuerySearch, canGetSearchEngines, canSearchWithEngine]) {
    const exact: Equal<ReturnType<typeof check>, boolean> = true;
    const result: boolean = check();
    void [exact, result];
}

// The shipped global augmentation is available from both native aliases.
const nativeEngines: Promise<chrome.search.SearchEngine[]> = browser.search.get();
const nativeSearch: Promise<void> = browser.search.search({query: "hello", engine: engine.name, tabId: 0});
void [nativeEngines, nativeSearch];

// @ts-expect-error A query cannot target both a tab and a disposition.
querySearch({text: "hello", tabId: 1, disposition: "NEW_TAB"});
// @ts-expect-error Engine search has the same mutually exclusive destinations.
searchWithEngine("hello", "Example", {tabId: 1, disposition: "NEW_TAB"});
// @ts-expect-error The native Firefox declaration must also enforce this constraint.
browser.search.search({query: "hello", tabId: 1, disposition: "NEW_TAB"});
// @ts-expect-error A search query requires text.
querySearch({tabId: 1});
// @ts-expect-error Engine selection is not part of search.query.
querySearch({text: "hello", engine: "Example"});
// @ts-expect-error Engine selection needs an engine name.
searchWithEngine("hello");
// @ts-expect-error Only native uppercase disposition values are accepted.
searchWithEngine("hello", "Example", {disposition: "new_tab"});
// @ts-expect-error get() is Promise-only; no callback overload is exposed.
browser.search.get(() => undefined);
