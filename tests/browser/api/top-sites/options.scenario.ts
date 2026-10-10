import type {TopSitesOptions} from "../../../../dist/index.js";
import {getTopSites} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "firefox-options",
    browsers: ["firefox"],
    async run() {
        const cases: TopSitesOptions[] = [
            {},
            {limit: 1, includeFavicon: true, includeBlocked: true, includePinned: true, includeSearchShortcuts: true, onePerDomain: false},
            {newtab: true, limit: 1, includeFavicon: true},
        ];

        for (const options of cases) {
            const sites = await getTopSites(options);
            assert(Array.isArray(sites), "Options call must resolve to an array");
            assert(sites.length <= (options.limit ?? 12), "Firefox did not apply the result limit");

            for (const site of sites) {
                assert(typeof site.url === "string" && typeof site.title === "string", "Invalid Firefox top site");
                assert(site.type === "url" || site.type === "search", "Firefox entry type was lost");
                assert(site.favicon === null || typeof site.favicon === "string", "Invalid Firefox favicon value");
            }
        }

        await rejects(() => getTopSites({limit: "invalid" as unknown as number}), "Native option validation must reject invalid types");
    },
} satisfies BrowserScenario;
