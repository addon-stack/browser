# search

Documentation: [Chrome Search API](https://developer.chrome.com/docs/extensions/reference/api/search),
[Firefox Search API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/search).

Search using the browser's default provider, or select an available engine in Firefox.
Search operations navigate to a results page and return `Promise<void>`; they do not return results or a tab ID,
and completion does not mean the results page has finished loading. This API has no events.

## Methods

- [isAvailableSearch()](#isAvailableSearch)
- [canQuerySearch()](#canQuerySearch)
- [canGetSearchEngines()](#canGetSearchEngines)
- [canSearchWithEngine()](#canSearchWithEngine)
- [querySearch(options)](#querySearch)
- [getSearchEngines()](#getSearchEngines)
- [searchWithEngine(text, engine, options?)](#searchWithEngine)
- [searchInTab(text, tabId)](#searchInTab)
- [searchInCurrentTab(text)](#searchInCurrentTab)
- [searchInNewTab(text)](#searchInNewTab)
- [searchInNewWindow(text)](#searchInNewWindow)
- [getDefaultSearchEngine()](#getDefaultSearchEngine)
- [hasSearchEngine(name)](#hasSearchEngine)

## Permissions and browser support

Declare the `search` permission in extension builds that use the native Search API:

```json
{"permissions": ["search"]}
```

Use these methods from an extension context where the API is exposed, such as a background script or popup.

| Browser | Default-provider query and destination helpers | List/select engines |
| --- | --- | --- |
| Chrome 87+ | Supported | Unavailable |
| Edge / Opera | Supported in versions implementing Chromium's Search API | Unavailable |
| Firefox desktop 111+ | Supported | Supported |
| Firefox desktop 63–110 | `query` unavailable | Supported; `disposition` requires Firefox 111+ |
| Safari macOS / iOS | Unavailable | Unavailable |
| Firefox for Android | Unavailable | Unavailable |

The table follows [MDN browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/search.json).
[Real-browser integration scenarios](../tests/browser/README.md) additionally exercise current Chromium and Firefox builds;
they do not verify every listed browser or historical version. Check individual methods at runtime in restricted contexts.

`isAvailableSearch()` checks namespace presence. The `can…` functions check whether a specific native method is callable;
they do not invoke it or guarantee permission, valid arguments, supported optional fields, or successful execution.
All these checks are synchronous, uncached, silent, and return `false` if API access throws.
Operations preserve native failures. Only the custom predicate `hasSearchEngine()` converts an unconfirmed result to `false`.

## Types

The package exports `SearchEngine` and `SearchTargetOptions`:

```ts
type SearchEngine = {
    name: string;
    isDefault: boolean;
    alias?: string;
    favIconUrl?: string;
};

type SearchTargetOptions =
    | {tabId?: number; disposition?: undefined}
    | {tabId?: undefined; disposition?: "CURRENT_TAB" | "NEW_TAB" | "NEW_WINDOW"};
```

`tabId` and `disposition` are mutually exclusive. Use engine names returned by `getSearchEngines()`;
the browser's installed engines are not a fixed list. Their metadata does not include search URL templates.
The Firefox additions to the global declarations are a type superset, not a runtime guarantee in Chrome.

---

<a name="isAvailableSearch"></a>

### isAvailableSearch

```ts
isAvailableSearch(): boolean
```

Returns whether the `search` namespace exists on the API selected by `browser()`.
For example, older Firefox versions can expose the namespace without supporting `query`.

```ts
import {isAvailableSearch} from "@addon-core/browser";

const available = isAvailableSearch();
```

<a name="canQuerySearch"></a>

### canQuerySearch

```ts
canQuerySearch(): boolean
```

Checks `search.query`, used by `querySearch()` and the four destination helpers.

```ts
import {canQuerySearch, searchInNewTab} from "@addon-core/browser";

if (canQuerySearch()) {
    await searchInNewTab("WebExtensions");
}
```

<a name="canGetSearchEngines"></a>

### canGetSearchEngines

```ts
canGetSearchEngines(): boolean
```

Checks `search.get`, used for engine enumeration and the default-engine helper.

```ts
import {canGetSearchEngines, getSearchEngines} from "@addon-core/browser";

if (canGetSearchEngines()) {
    const engines = await getSearchEngines();
    console.log(engines);
}
```

<a name="canSearchWithEngine"></a>

### canSearchWithEngine

```ts
canSearchWithEngine(): boolean
```

Checks `search.search`. This does not verify that a particular engine name exists.

```ts
import {canSearchWithEngine, getDefaultSearchEngine, canGetSearchEngines, searchWithEngine} from "@addon-core/browser";

if (canSearchWithEngine() && canGetSearchEngines()) {
    const engine = await getDefaultSearchEngine();
    if (engine) {
        await searchWithEngine("WebExtensions", engine.name);
    }
}
```

<a name="querySearch"></a>

### querySearch

```ts
querySearch(options: chrome.search.QueryInfo): Promise<void>
```

Forwards `{text, tabId?, disposition?}` to native `search.query` with the user's default provider.
With no destination specified, the browser uses `CURRENT_TAB`. Text is passed unchanged; do not URL-encode it.
Callback failures through `runtime.lastError`, Promise rejections, and synchronous native errors reject the returned Promise.

```ts
import {querySearch} from "@addon-core/browser";

await querySearch({text: "café & extensions", disposition: "NEW_TAB"});
```

<a name="getSearchEngines"></a>

### getSearchEngines

```ts
getSearchEngines(): Promise<SearchEngine[]>
```

Returns Firefox's engine list unchanged. It rejects if the method is absent or the native call fails.
See [Firefox search.get](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/search/get).

```ts
import {getSearchEngines} from "@addon-core/browser";

const engines = await getSearchEngines();
console.log(engines.map(engine => engine.name));
```

<a name="searchWithEngine"></a>

### searchWithEngine

```ts
searchWithEngine(text: string, engine: string, options?: SearchTargetOptions): Promise<void>
```

Calls Firefox's `search.search` with `{query: text, engine, ...destination}`. With no destination, Firefox uses
`NEW_TAB`, unlike `querySearch`. An unknown engine rejects; this method does not substitute another provider.
It does not change the browser's default engine. `disposition` requires Firefox 111+; `tabId` works in older versions.
See [Firefox search.search](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/search/search).

```ts
import {getSearchEngines, searchWithEngine} from "@addon-core/browser";

const engine = (await getSearchEngines()).find(item => item.isDefault);
if (engine) {
    await searchWithEngine("WebExtensions", engine.name, {tabId: 42});
}
```

<a name="searchInTab"></a>

### searchInTab

```ts
searchInTab(text: string, tabId: number): Promise<void>
```

Uses `querySearch` to search in an existing tab with the default provider. Does not create a tab first.

```ts
import {searchInTab} from "@addon-core/browser";

await searchInTab("WebExtensions", 42);
```

<a name="searchInCurrentTab"></a>

### searchInCurrentTab

```ts
searchInCurrentTab(text: string): Promise<void>
```

Uses `querySearch` with `CURRENT_TAB`; the native browser decides which tab is current in the calling context.

```ts
import {searchInCurrentTab} from "@addon-core/browser";

await searchInCurrentTab("WebExtensions");
```

<a name="searchInNewTab"></a>

### searchInNewTab

```ts
searchInNewTab(text: string): Promise<void>
```

Uses `querySearch` with `NEW_TAB`.

```ts
import {searchInNewTab} from "@addon-core/browser";

await searchInNewTab("WebExtensions");
```

<a name="searchInNewWindow"></a>

### searchInNewWindow

```ts
searchInNewWindow(text: string): Promise<void>
```

Uses `querySearch` with `NEW_WINDOW`.

```ts
import {searchInNewWindow} from "@addon-core/browser";

await searchInNewWindow("WebExtensions");
```

<a name="getDefaultSearchEngine"></a>

### getDefaultSearchEngine

```ts
getDefaultSearchEngine(): Promise<SearchEngine | undefined>
```

Finds the engine with `isDefault: true` in a fresh engine list. Returns `undefined` if none is listed.
Unavailable APIs and lookup failures reject; they are not treated as an empty list.

```ts
import {getDefaultSearchEngine} from "@addon-core/browser";

const engine = await getDefaultSearchEngine();
console.log(engine?.name);
```

<a name="hasSearchEngine"></a>

### hasSearchEngine

```ts
hasSearchEngine(name: string): Promise<boolean>
```

Returns `true` only when a fresh list contains an exact, case-sensitive engine name. Returns `false` for a missing
engine, unavailable API, or lookup error. This predicate does not log and cannot guarantee that a later search succeeds.

```ts
import {hasSearchEngine} from "@addon-core/browser";

const installed = await hasSearchEngine("DuckDuckGo");
```

## Safari: explicitly open a provider URL

Safari has no native Search API. Adding the `search` permission does not enable it. The availability/capability checks
return `false`; search operations, including destination helpers, reject. The package does not implement an automatic fallback.

An application can choose a provider itself and open its results URL with the existing `createTab()` helper:

```ts
import {createTab} from "@addon-core/browser";

const url = new URL("https://duckduckgo.com/");
url.searchParams.set("q", "café & WebExtensions");
await createTab({url: url.href});
```

This explicitly searches DuckDuckGo, regardless of Safari's default provider, and does not change browser settings.
`URLSearchParams` encodes the query. Use `updateTab(tabId, {url: url.href})` to navigate an existing tab instead.
See [Tabs API documentation](tabs.md) and [Safari Tabs API compatibility](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/tabs.json).
