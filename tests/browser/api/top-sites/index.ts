import get from "./get.scenario";
import options from "./options.scenario";
import permissions from "./permissions.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "top-sites",
    browsers: ["chromium", "firefox"],
    profiles: [
        {id: "granted", permissions: ["topSites"], scenarios: [get, options]},
        {id: "denied", permissions: [], scenarios: [permissions]},
    ],
} satisfies BrowserSuite;
