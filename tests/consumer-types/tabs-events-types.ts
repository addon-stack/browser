import {
    onTabActivated,
    onTabAttached,
    onTabCreated,
    onTabDetached,
    onTabHighlighted,
    onTabMoved,
    onTabRemoved,
    onTabReplaced,
    onTabUpdated,
    onTabZoomChange,
} from "@addon-core/browser";

type Callbacks = {
    onTabActivated: Parameters<typeof chrome.tabs.onActivated.addListener>[0];
    onTabAttached: Parameters<typeof chrome.tabs.onAttached.addListener>[0];
    onTabCreated: Parameters<typeof chrome.tabs.onCreated.addListener>[0];
    onTabDetached: Parameters<typeof chrome.tabs.onDetached.addListener>[0];
    onTabHighlighted: Parameters<typeof chrome.tabs.onHighlighted.addListener>[0];
    onTabMoved: Parameters<typeof chrome.tabs.onMoved.addListener>[0];
    onTabRemoved: Parameters<typeof chrome.tabs.onRemoved.addListener>[0];
    onTabReplaced: Parameters<typeof chrome.tabs.onReplaced.addListener>[0];
    onTabUpdated: Parameters<typeof chrome.tabs.onUpdated.addListener>[0];
    onTabZoomChange: Parameters<typeof chrome.tabs.onZoomChange.addListener>[0];
};

const helpers = {
    onTabActivated,
    onTabAttached,
    onTabCreated,
    onTabDetached,
    onTabHighlighted,
    onTabMoved,
    onTabRemoved,
    onTabReplaced,
    onTabUpdated,
    onTabZoomChange,
};

type Expected = {[K in keyof Callbacks]: (callback: Callbacks[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof helpers, Expected> = true;
void [helpers, signaturesUnchanged];

// @ts-expect-error Tab IDs must remain numbers, not strings or any.
onTabUpdated((_tabId: string) => undefined);
// @ts-expect-error The callback remains required.
onTabCreated();
