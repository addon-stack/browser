import {
    browser, groupTabs, moveTabGroup, onTabGroupCreated, onTabGroupMoved,
    onTabGroupRemoved, onTabGroupUpdated, type TabGroup, ungroupTab, updateTabGroup,
} from "../../../../dist/index.js";
import {assert, waitFor} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "tab-group-events",
    async run({browser: browserName}) {
        const native = browser();
        const windows = new Set<number>();
        const off: (() => void)[] = [];
        const created: TabGroup[] = [];
        const updated: TabGroup[] = [];
        const moved: TabGroup[] = [];
        const removed: Parameters<Parameters<typeof onTabGroupRemoved>[0]>[] = [];

        try {
            const source = await native.windows.create({url: Array(4).fill("about:blank"), focused: false});
            assert(source?.id !== undefined, "Missing source window");
            windows.add(source.id);
            const destination = await native.windows.create({url: ["about:blank", "about:blank"], focused: false});
            assert(destination?.id !== undefined, "Missing destination window");
            windows.add(destination.id);
            const tabs = await native.tabs.query({windowId: source.id});
            const first = tabs[1].id;
            const second = tabs[2].id;
            const spare = tabs[3].id;
            assert(first !== undefined && second !== undefined && spare !== undefined, "Missing fixture tabs");

            off.push(onTabGroupCreated(group => {
                created.push(group);
            }));

            off.push(onTabGroupUpdated(group => {
                updated.push(group);
            }));

            off.push(onTabGroupMoved(group => {
                moved.push(group);
            }));

            off.push(onTabGroupRemoved((...args) => {
                removed.push(args);
            }));

            const groupId = await groupTabs({tabIds: [first, second], createProperties: {windowId: source.id}});
            const creation = await waitFor(async () => created.find(group => group.id === groupId), Boolean, "group creation");
            assert(creation?.windowId === source.id, "Creation payload lost its window");
            assert(browserName === "chromium" ? creation.shared === false : !("shared" in creation), "Unexpected shared field in creation payload");
            await updateTabGroup(groupId, {title: "Event fixture", color: "green"});
            const change = await waitFor(async () => updated.find(group => group.id === groupId && group.title === "Event fixture" && group.color === "green"), Boolean, "group update");
            assert(change?.windowId === source.id, "Updated payload lost group details");
            await moveTabGroup(groupId, {index: -1});
            await waitFor(async () => moved.some(group => group.id === groupId && group.windowId === source.id), Boolean, "within-window group move");
            const before = {created: created.length, moved: moved.length, removed: removed.length};
            await moveTabGroup(groupId, {windowId: destination.id, index: 1});
            const nextId = (await native.tabs.get(first)).groupId;

            if (browserName === "firefox") {
                await waitFor(async () => moved.slice(before.moved).some(group => group.id === nextId && group.windowId === destination.id), Boolean, "Firefox cross-window group move");
            } else {
                await waitFor(async () => removed.slice(before.removed).some(([group]) => group.id === groupId && group.windowId === source.id), Boolean, "Chromium removal from source window");
                await waitFor(async () => created.slice(before.created).some(group => group.id === nextId && group.windowId === destination.id), Boolean, "Chromium creation in destination window");
                assert(!moved.slice(before.moved).some(group => group.windowId === destination.id), "Chromium must not synthesize a cross-window onMoved");
            }

            const removedBefore = removed.length;
            await ungroupTab([first, second]);
            const removal = await waitFor(async () => removed.slice(removedBefore).find(([group]) => group.id === nextId), Boolean, "empty group removal");
            assert(removal?.[0].title === "Event fixture", "Removal lost group metadata");
            assert(browserName === "firefox" ? removal[1]?.isWindowClosing === false : removal.length === 1, "Unexpected ordinary-removal arguments");
            const closingId = await groupTabs({tabIds: [first, second], createProperties: {windowId: destination.id}});
            const beforeClose = removed.length;
            await native.windows.remove(destination.id);
            windows.delete(destination.id);
            const closing = await waitFor(async () => removed.slice(beforeClose).find(([group]) => group.id === closingId), Boolean, "window-closing group removal");
            assert(closing, "Closing the window did not remove its group");
            assert(browserName === "firefox" ? closing[1]?.isWindowClosing === true : closing.length === 1, "Window-closing removal payload was changed");

            off.forEach(unsubscribe => unsubscribe());
            off.forEach(unsubscribe => unsubscribe());
            const counts = [created.length, updated.length, moved.length, removed.length];

            // Native event delivery is a barrier for each unsubscribed production listener.
            const afterUnsubscribe = async (event: typeof native.tabGroups.onCreated, invoke: () => Promise<unknown>) => {
                let delivered = false;

                const listener = () => {
                    delivered = true;
                };

                event.addListener(listener);

                try {
                    const result = await invoke();
                    await waitFor(async () => delivered, Boolean, "native event after unsubscribe");
                    assert([created.length, updated.length, moved.length, removed.length].every((count, index) => count === counts[index]), "An unsubscribed listener still received an event");

                    return result;
                } finally {
                    event.removeListener(listener);
                }
            };

            await afterUnsubscribe(native.tabGroups.onCreated, () => native.tabs.group({tabIds: [spare], createProperties: {windowId: source.id}}));
            const lastId = (await native.tabs.get(spare)).groupId;
            await afterUnsubscribe(native.tabGroups.onUpdated, () => native.tabGroups.update(lastId, {title: "After unsubscribe"}));
            await afterUnsubscribe(native.tabGroups.onMoved, () => native.tabGroups.move(lastId, {index: 0}));
            await afterUnsubscribe(native.tabGroups.onRemoved, () => native.tabs.ungroup(spare));
        } finally {
            off.forEach(unsubscribe => unsubscribe());

            for (const windowId of windows) {
                await native.windows.remove(windowId);
            }
        }
    },
} satisfies BrowserScenario;
