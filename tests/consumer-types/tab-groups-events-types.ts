import {onTabGroupCreated, onTabGroupMoved, onTabGroupRemoved, onTabGroupUpdated, type TabGroup, type TabGroupRemoveInfo} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Subscription = (callback: (group: TabGroup) => void) => () => void;
type Removed = (callback: (group: TabGroup, removeInfo?: TabGroupRemoveInfo) => void) => () => void;

const signatures: [
    Equal<typeof onTabGroupCreated, Subscription>,
    Equal<typeof onTabGroupUpdated, Subscription>,
    Equal<typeof onTabGroupMoved, Subscription>,
    Equal<typeof onTabGroupRemoved, Removed>,
] = [true, true, true, true];

void signatures;

const off: () => void = onTabGroupRemoved((group, info) => {
    const shared: boolean | undefined = group.shared;
    const windowClosing: boolean | undefined = info?.isWindowClosing;
    void shared; void windowClosing;
    // @ts-expect-error Chromium does not supply removeInfo.
    const guaranteed: boolean = info.isWindowClosing;
    void guaranteed;
});

off();

// @ts-expect-error A native Chrome-only callback would assume shared always exists.
onTabGroupCreated((group: chrome.tabGroups.TabGroup) => {
    void group.shared;
});

// @ts-expect-error The callback receives a group object, not its ID.
onTabGroupMoved((groupId: number) => {
    void groupId;
});
