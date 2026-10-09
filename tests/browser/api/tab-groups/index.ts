import events from "./events.scenario";
import lifecycle from "./lifecycle.scenario";
import permissions from "./permissions.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "tab-groups",
    browsers: ["chromium", "firefox"],
    profiles: [
        {id: "granted", permissions: ["tabGroups"], scenarios: [lifecycle, events]},
        {id: "denied", permissions: [], scenarios: [permissions]},
    ],
} satisfies BrowserSuite;
