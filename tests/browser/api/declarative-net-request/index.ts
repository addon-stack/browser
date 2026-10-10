import feedback from "./feedback.scenario";
import permissions from "./permissions.scenario";
import rules from "./rules.scenario";

import type {BrowserSuite} from "../../types";

const manifest = {
    declarative_net_request: {rule_resources: [{id: "fixture", enabled: true, path: "fixtures/rules.json"}]},
};

export default {
    id: "declarative-net-request",
    browsers: ["chromium", "firefox"],
    profiles: [
        {
            id: "granted", permissions: ["declarativeNetRequest", "scripting"], scenarios: [rules],
            manifest: {chromium: manifest, firefox: manifest},
            firefoxPreferences: {"extensions.dnr.feedback": false},
            resources: {"fixtures/rules.json": [
                {id: 10, priority: 1, action: {type: "block"}, condition: {urlFilter: "/network/static", resourceTypes: ["xmlhttprequest"]}},
            ]},
        },
        {
            id: "feedback", permissions: ["declarativeNetRequest", "declarativeNetRequestFeedback", "scripting"], scenarios: [feedback],
            firefoxPreferences: {"extensions.dnr.feedback": true},
            manifest: {chromium: {action: {}}},
        },
        {id: "denied", permissions: [], scenarios: [permissions]},
    ],
} satisfies BrowserSuite;
