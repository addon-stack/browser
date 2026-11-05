import contracts from "./contracts.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "compatibility",
    browsers: ["chromium", "firefox"],
    profiles: [{
        id: "granted",
        permissions: ["alarms", "tabs", "cookies"],
        manifest: {chromium: {action: {}}, firefox: {action: {}}},
        scenarios: [contracts],
    }],
} satisfies BrowserSuite;
