# topSites

Documentation: [Chrome Top Sites API](https://developer.chrome.com/docs/extensions/reference/api/topSites),
[Firefox Top Sites API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/topSites).

A promise-based wrapper for the `topSites` API to retrieve the browser's most-visited sites,
including their titles and URLs. Firefox also supports options for selecting entries and requesting
favicons. This API has no events.

## Methods

- [isAvailableTopSites()](#isAvailableTopSites)
- [getTopSites(options?)](#getTopSites)

## Permissions and browser support

Declare the permission in the extension manifest:

```json
{
  "permissions": ["topSites"]
}
```

Reading top sites does not require the `history` permission. Use this API in an extension context,
such as a background script, popup or extension page.

| Browser | Basic call | Options | Notes |
| --- | --- | --- | --- |
| Chrome / Chromium | Yes | No | Results exclude user-customized new-tab shortcuts. |
| Microsoft Edge desktop | Yes | No | Chromium API; documented for MV2 and MV3. |
| Opera desktop | Yes | No | Opera documents no differences from Chrome. |
| Firefox desktop | Yes | Yes | Options control the list and optional favicon data. |
| Safari / iOS Safari | No | No | `isAvailableTopSites()` returns `false` when the namespace is absent. |

The table describes documented support, not proof for every browser version. See the
[Chrome reference](https://developer.chrome.com/docs/extensions/reference/api/topSites),
[Edge API list](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support),
[Opera API list](https://help.opera.com/en/extensions/apis/),
[Firefox reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/topSites/get),
and [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/topSites.json).

Safari has no native Top Sites API. An application can display its own saved shortcuts instead;
this package does not substitute browser history, fetch sites or invent a list when the API is unavailable.

## Types

The package exports `TopSite` and `TopSitesOptions`.

### TopSite

`TopSite` aliases `chrome.topSites.MostVisitedURL`, including Firefox's optional fields:

```ts
interface TopSite {
    url: string;
    title: string;
    favicon?: string | null;
    type?: "url" | "search";
}
```

Chrome supplies `url` and `title`. Firefox also supplies an entry `type` and may return `null` for
`favicon` when not requested or unavailable. The wrapper retains those values. See
[Mozilla's implementation](https://github.com/mozilla-firefox/firefox/blob/main/browser/components/extensions/parent/ext-topSites.js).

Top sites are a browser-selected list, not a complete history export or a portable ranking.
Do not assume a fixed number of entries, identical results across browsers, or immediate inclusion
of a newly visited page.

### TopSitesOptions

`TopSitesOptions` is an alias of the package's Firefox augmentation `chrome.topSites.GetOptions`.
These declarations are shared by the native `browser` and `chrome` aliases; their presence in
TypeScript does not add runtime support to Chromium or Safari.

| Property | Type | Default | Meaning |
| --- | --- | --- | --- |
| `limit` | `number` | `12` | Maximum returned entries, documented range 1–100. |
| `includeBlocked` | `boolean` | `false` | Include sites removed from the new-tab list. |
| `includeFavicon` | `boolean` | `false` | Request available favicons. |
| `includePinned` | `boolean` | `false` | Include pinned sites. |
| `includeSearchShortcuts` | `boolean` | `false` | Include Firefox search shortcuts. |
| `onePerDomain` | `boolean` | `true` | Include at most one page per domain. |
| `newtab` | `boolean` | `false` | Request the new-tab page's list. |

With `newtab: true`, Firefox ignores the other options except `limit` and `includeFavicon`.
Firefox may fall back to its most-visited list if the user disables the Top Sites feed. These
preferences and ranking decisions remain owned by the browser.

---

<a name="isAvailableTopSites"></a>

### isAvailableTopSites

```ts
isAvailableTopSites(): boolean
```

Returns `true` when the `topSites` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
It checks namespace presence only; it does not guarantee support for Firefox options, a nonempty list,
or a successful operation.

```ts
import {getTopSites, isAvailableTopSites} from "@addon-core/browser";

if (isAvailableTopSites()) {
    const sites = await getTopSites();

    for (const site of sites) {
        console.log(site.title, site.url);
    }
}
```

<a name="getTopSites"></a>

### getTopSites

```ts
getTopSites(options?: TopSitesOptions): Promise<TopSite[]>
```

Returns the native list, preserving its order, entries and additional fields. Without options, it
uses the package's callback/Promise adapter. Explicit `undefined` also uses the no-options call.
The list is not cached, sorted or normalized by the wrapper. An empty array is a valid result.

Passing an options object invokes the native Promise-returning options overload, which is supported
by Firefox. Chromium rejects that signature, including `getTopSites({})`. The wrapper does not drop
options, retry without them or emulate them by filtering a different list.

Errors remain Promise rejections: this includes native callback errors, Promise rejections,
invalid arguments, an unavailable API and invalidated extension contexts. Failed reads are not
converted to an empty array.

```ts
import {getTopSites} from "@addon-core/browser";

try {
    const sites = await getTopSites();
    console.log(sites);
} catch (error) {
    console.error("Could not read top sites", error);
}
```

#### Firefox options

Pass `TopSitesOptions` when using Firefox. These options are described in the [types section](#topsitesoptions).

```ts
import {getTopSites, type TopSitesOptions} from "@addon-core/browser";

// Firefox only. isAvailableTopSites() alone does not establish options support.
const options: TopSitesOptions = {
    limit: 8,
    includeFavicon: true,
    includePinned: true,
    onePerDomain: true,
};

const sites = await getTopSites(options);

for (const site of sites) {
    console.log(site.title, site.url, site.favicon ?? "No favicon");
}
```
