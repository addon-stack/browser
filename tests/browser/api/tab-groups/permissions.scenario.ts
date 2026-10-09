import {
    browser, getTabGroup, isAvailableTabGroups, moveTabGroup,
    onTabGroupCreated, onTabGroupMoved, onTabGroupRemoved, onTabGroupUpdated,
    queryTabGroups, updateTabGroup,
} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "missing-tab-groups-permission",
    async run() {
        assert(!browser().runtime.getManifest().permissions?.includes("tabGroups"), "Denied profile accidentally grants tabGroups");
        assert(!isAvailableTabGroups(), "tabGroups must be unavailable without permission");

        for (const invoke of [
            () => getTabGroup(1), () => queryTabGroups(),
            () => updateTabGroup(1, {title: "Denied"}), () => moveTabGroup(1, {index: 0}),
        ]) {
            await rejects(invoke, "A tabGroups method must fail without permission");
        }

        for (const subscribe of [onTabGroupCreated, onTabGroupUpdated, onTabGroupMoved, onTabGroupRemoved]) {
            await rejects(() => subscribe(() => undefined), "A subscription must fail without permission");
        }
    },
} satisfies BrowserScenario;
