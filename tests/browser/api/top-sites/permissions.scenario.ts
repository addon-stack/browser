import {browser, getTopSites, isAvailableTopSites} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "missing-top-sites-permission",
    async run() {
        assert(!browser().runtime.getManifest().permissions?.includes("topSites"), "Negative fixture accidentally grants topSites");
        assert(!isAvailableTopSites(), "topSites must be unavailable without permission");
        await rejects(() => getTopSites(), "getTopSites must reject without permission");
        await rejects(() => getTopSites({limit: 1}), "Options call must reject without permission");
    },
} satisfies BrowserScenario;
