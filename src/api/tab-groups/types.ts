/** Native group data; shared is absent in Firefox and older Chromium versions. */
export interface TabGroup extends Omit<chrome.tabGroups.TabGroup, "shared"> {
    shared?: boolean;
}

/** Additional removal information supplied by Firefox. */
export interface TabGroupRemoveInfo {
    isWindowClosing: boolean;
}
