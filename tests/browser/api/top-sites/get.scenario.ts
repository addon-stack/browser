import {getTopSites, isAvailableTopSites} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "get-top-sites",
    async run({browser}) {
        assert(isAvailableTopSites(), "topSites must be available with permission");

        for (const sites of [await getTopSites(), await getTopSites(undefined)]) {
            assert(Array.isArray(sites), "getTopSites must resolve to an array (which may be empty)");
            assert(sites.every(site => typeof site.url === "string" && typeof site.title === "string"), "Invalid top site metadata");
        }

        if (browser === "chromium") {
            await rejects(() => getTopSites({}), "Chromium must reject unsupported options, even an empty object");
            await rejects(() => getTopSites({limit: 1}), "Chromium options must not be silently discarded");
        }
    },
} satisfies BrowserScenario;
