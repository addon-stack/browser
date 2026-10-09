import {getTopSites, isAvailableTopSites, type TopSite, type TopSitesOptions} from "@addon-core/browser";
import {createBrowserHarness} from "@addon-core/browser/testing";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const exactGet: Equal<typeof getTopSites, (options?: TopSitesOptions) => Promise<TopSite[]>> = true;
const exactAvailable: Equal<typeof isAvailableTopSites, () => boolean> = true;
void [exactGet, exactAvailable];

const options: TopSitesOptions = {
    limit: 10, includeBlocked: true, includeFavicon: true, includePinned: true,
    includeSearchShortcuts: false, onePerDomain: false, newtab: false,
};

const sites: TopSite[] = [
    {url: "https://example.test/", title: "Example"},
    {url: "https://search.test/", title: "Search", type: "search", favicon: null},
    {url: "https://icon.test/", title: "Icon", type: "url", favicon: "data:image/png;base64,AA=="},
];

const calls: Promise<TopSite[]>[] = [getTopSites(), getTopSites(undefined), getTopSites({}), getTopSites(options)];
// Both native aliases retain the original callback/Promise overloads and gain Firefox options.
const native: Promise<chrome.topSites.MostVisitedURL[]>[] = [chrome.topSites.get(), browser.topSites.get(options)];

chrome.topSites.get(result => {
    const values: TopSite[] = result;
    void values;
});

const harness = createBrowserHarness();
harness.configurable.active.topSites.get.setResult(sites);
void [calls, native];

// @ts-expect-error Only native option names are accepted.
getTopSites({maxResults: 10});
// @ts-expect-error Limit is a number.
getTopSites({limit: "10"});
// @ts-expect-error Flags are booleans.
getTopSites({includeFavicon: "yes"});
// @ts-expect-error The wrapper returns a Promise and has no callback argument.
getTopSites(() => undefined);
// @ts-expect-error Most-visited records require a title.
const missingTitle: TopSite = {url: "https://example.test/"};
// @ts-expect-error Firefox exposes only url/search entry types.
const unknownType: TopSite = {url: "https://example.test/", title: "Example", type: "bookmark"};
void [missingTitle, unknownType];
