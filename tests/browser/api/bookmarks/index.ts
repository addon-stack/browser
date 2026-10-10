import events from "./events.scenario";
import lifecycle from "./lifecycle.scenario";
import permissions from "./permissions.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "bookmarks",
    browsers: ["chromium", "firefox"],
    profiles: [
        {id: "granted", permissions: ["bookmarks"], scenarios: [lifecycle, events]},
        {id: "denied", permissions: [], scenarios: [permissions]},
    ],
} satisfies BrowserSuite;
