import {
    browser, getTabGroup, groupTabs, isAvailableTabGroups, moveTabGroup,
    queryTabGroups, queryTabs, ungroupTab, updateTabGroup,
} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "tab-group-lifecycle",
    async run({browser: browserName}) {
        assert(isAvailableTabGroups(), "tabGroups must be available with permission");
        const native = browser();
        const windows: number[] = [];

        try {
            const source = await native.windows.create({url: Array(4).fill("about:blank"), focused: false});
            assert(source?.id !== undefined, "Missing source window");
            windows.push(source.id);
            const destination = await native.windows.create({url: ["about:blank", "about:blank"], focused: false});
            assert(destination?.id !== undefined, "Missing destination window");
            windows.push(destination.id);
            const tabs = await native.tabs.query({windowId: source.id});
            const first = tabs[1].id;
            const second = tabs[2].id;
            assert(first !== undefined && second !== undefined, "Missing fixture tabs");
            const groupId = await groupTabs({tabIds: [first, second], createProperties: {windowId: source.id}});
            const group = await getTabGroup(groupId);
            assert(group.id === groupId && group.windowId === source.id, "getTabGroup returned the wrong group");
            assert((await queryTabs({groupId})).length === 2, "Grouping did not change native membership");

            if (browserName === "chromium") {
                assert(group.shared === false, "New Chromium group must not be shared");
                assert((await queryTabGroups({windowId: source.id, shared: false})).some(item => item.id === groupId), "Chromium shared filter lost the group");
            } else {
                assert(!("shared" in group), "Firefox result must not invent shared status");
            }

            assert((await queryTabGroups()).some(item => item.id === groupId), "Default query must include the fixture group");
            assert((await queryTabGroups(undefined)).some(item => item.id === groupId), "Explicit undefined must use an empty query");
            const title = `Addon group ${Date.now()}`;
            const updated = await updateTabGroup(groupId, {title, color: "red", collapsed: true});
            assert(updated === undefined || updated.id === groupId, "Unexpected update result");
            const stored = await native.tabGroups.get(groupId);
            assert(stored.title === title && stored.color === "red" && stored.collapsed, "Update did not reach native state");
            const found = await queryTabGroups({windowId: source.id, title, color: "red", collapsed: true});
            assert(found.length === 1 && found[0].id === groupId, "Combined filters did not select the group");
            assert((await queryTabGroups({windowId: source.id, title: `${title}-missing`})).length === 0, "An empty query result must stay empty");
            await updateTabGroup(groupId, {collapsed: false});
            const expanded = await native.tabGroups.get(groupId);
            assert(!expanded.collapsed && expanded.title === title && expanded.color === "red", "Partial update changed unrelated properties");
            const moved = await moveTabGroup(groupId, {index: -1});
            assert(moved === undefined || moved.id === groupId, "Unexpected move result");
            const atEnd = await native.tabs.query({windowId: source.id, groupId});
            assert(atEnd.length === 2 && atEnd[0].index === 2, "Group must move with its tabs to the end");
            const transferred = await moveTabGroup(groupId, {windowId: destination.id, index: 1});
            const member = await native.tabs.get(first);
            const nextId = member.groupId;
            assert(member.windowId === destination.id && nextId >= 0, "Cross-window move lost group membership");
            const next = await getTabGroup(nextId);
            assert(next.title === title && next.windowId === destination.id, "Cross-window move lost group state");
            assert(transferred === undefined || transferred.id === nextId, "Move result disagrees with native group ID");
            const transferredTabs = await native.tabs.query({windowId: destination.id, groupId: nextId});
            assert(transferredTabs.length === 2 && transferredTabs[0].index === 1, "Cross-window destination index or membership is wrong");
            assert((await queryTabGroups({windowId: source.id})).length === 0, "Source window retained the transferred group");
            await rejects(() => getTabGroup(-1), "A nonexistent group must reject");
            await rejects(() => updateTabGroup(-1, {title}), "Updating a nonexistent group must reject");
            await rejects(() => moveTabGroup(-1, {index: 0}), "Moving a nonexistent group must reject");
            await ungroupTab([first, second]);
            assert((await native.tabs.get(first)).groupId === -1, "Ungrouping must retain the tab without a group");
            await rejects(() => getTabGroup(nextId), "An empty group must be removed");
            assert((await queryTabGroups({windowId: destination.id})).length === 0, "Removed group remained queryable");
        } finally {
            for (const windowId of windows.reverse()) {
                await native.windows.remove(windowId);
            }
        }
    },
} satisfies BrowserScenario;
