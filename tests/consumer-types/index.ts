import {onTabUpdated} from "@addon-core/browser";

onTabUpdated((tabId, changeInfo, tab) => {
    const id: number = tabId;
    const info: chrome.tabs.OnUpdatedInfo = changeInfo;
    const currentTab: chrome.tabs.Tab = tab;

    void id;
    void info;
    void currentTab;
});
