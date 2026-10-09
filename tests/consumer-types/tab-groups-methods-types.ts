import {getTabGroup, isAvailableTabGroups, moveTabGroup, queryTabGroups, type TabGroup, updateTabGroup} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const signatures: [
    Equal<typeof isAvailableTabGroups, () => boolean>,
    Equal<typeof getTabGroup, (groupId: number) => Promise<TabGroup>>,
    Equal<typeof queryTabGroups, (queryInfo?: chrome.tabGroups.QueryInfo) => Promise<TabGroup[]>>,
    Equal<typeof updateTabGroup, (groupId: number, properties: chrome.tabGroups.UpdateProperties) => Promise<TabGroup | undefined>>,
    Equal<typeof moveTabGroup, (groupId: number, properties: chrome.tabGroups.MoveProperties) => Promise<TabGroup | undefined>>,
] = [true, true, true, true, true];

void signatures;

const firefoxGroup: TabGroup = {id: 1, windowId: 1, title: "Work", color: "blue", collapsed: false};
const chromiumGroup: TabGroup = {...firefoxGroup, shared: false};
void chromiumGroup;

queryTabGroups();
queryTabGroups({windowId: 1, title: "Work*", color: "blue", collapsed: false, shared: false});
updateTabGroup(1, {title: "Changed", color: "red", collapsed: true});
moveTabGroup(1, {index: -1, windowId: 2});

// @ts-expect-error A group ID must be a number.
getTabGroup("one");
// @ts-expect-error Moving requires a destination index.
moveTabGroup(1, {windowId: 2});
// @ts-expect-error Only native colors are accepted.
updateTabGroup(1, {color: "magenta"});
// @ts-expect-error Shared status is read-only; update does not accept it.
updateTabGroup(1, {shared: true});
// @ts-expect-error The native operation may resolve without a group.
const alwaysGroup: Promise<TabGroup> = moveTabGroup(1, {index: 0});
void alwaysGroup;
// @ts-expect-error Firefox groups do not provide shared.
const alwaysShared: boolean = firefoxGroup.shared;
void alwaysShared;
