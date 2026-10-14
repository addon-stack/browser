import icon from "./icon.scenario";
import unsupportedIcon from "./side-panel.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "sidebar",
    browsers: ["firefox"],
    profiles: [{
        id: "sidebar-action",
        permissions: [],
        // A local resource for panel URL roundtrips; these scenarios never open the panel.
        resources: {"fixtures/panel.json": {panel: "sidebar"}},
        manifest: {firefox: {sidebar_action: {default_panel: "fixtures/panel.json", default_title: "Sidebar fixture"}}},
        scenarios: [icon],
    }],
} satisfies BrowserSuite;

export const sidePanel = {
    id: "side-panel",
    browsers: ["chromium"],
    profiles: [{
        id: "side-panel-only",
        permissions: ["sidePanel"],
        resources: {"fixtures/panel.json": {panel: "sidebar"}},
        manifest: {chromium: {side_panel: {default_path: "fixtures/panel.json"}}},
        scenarios: [unsupportedIcon],
    }],
} satisfies BrowserSuite;
