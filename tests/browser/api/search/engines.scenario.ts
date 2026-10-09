import {getDefaultSearchEngine, getSearchEngines, hasSearchEngine, searchWithEngine} from "../../../../dist/index.js";
import {assert, rejects, waitFor} from "../../extension/assert";
import {checkNavigation} from "./navigation";

import type {BrowserScenario} from "../../types";

export default {
    id: "firefox-engines",
    browsers: ["firefox"],
    async run(context) {
        const name = "Browser integration engine";
        const engines = await waitFor(getSearchEngines, items => items.some(engine => engine.name === name), "test engine installation");
        assert(engines.length > 0 && engines.every(engine => typeof engine.name === "string" && typeof engine.isDefault === "boolean"), "Invalid engine metadata");
        const defaultEngine = await getDefaultSearchEngine();
        assert(defaultEngine?.name === engines.find(engine => engine.isDefault)?.name && defaultEngine?.isDefault, "Default engine differs from native list");
        assert(await hasSearchEngine(name), "Installed engine must be found");
        assert(!await hasSearchEngine("addon-core-nonexistent-engine"), "Nonexistent engine must not be found");
        await checkNavigation(context, "new-tab", text => searchWithEngine(text, name), "search.browser.test");
        await checkNavigation(context, "tab", (text, tabId) => searchWithEngine(text, name, {tabId}), "search.browser.test");
        await rejects(() => searchWithEngine("addon test", "addon-core-nonexistent-engine"), "Unknown engine must reject");
    },
} satisfies BrowserScenario;
