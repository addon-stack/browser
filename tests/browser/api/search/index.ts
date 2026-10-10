import engines from "./engines.scenario";
import permissions from "./permissions.scenario";
import query from "./query.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "search",
    browsers: ["chromium", "firefox"],
    profiles: [
        {
            id: "granted",
            permissions: ["search", "tabs", "webNavigation"],
            scenarios: [query, engines],
            manifest: {firefox: {chrome_settings_overrides: {search_provider: {
                name: "Browser integration engine",
                search_url: "https://search.browser.test/?q={searchTerms}",
                keyword: "browser-integration",
                is_default: false,
            }}}},
        },
        {id: "denied", permissions: [], scenarios: [permissions]},
    ],
} satisfies BrowserSuite;
