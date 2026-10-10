import {browser} from "../../../../dist/index.js";
import {assert, waitFor} from "../../extension/assert";

import type {ScenarioContext} from "../../types";

type Destination = "current" | "tab" | "new-tab" | "new-window";

export async function checkNavigation(
    context: ScenarioContext,
    destination: Destination,
    invoke: (text: string, tabId: number) => Promise<void>,
    expectedHost?: string
): Promise<void> {
    const api = browser();
    const initialWindows = new Set((await api.windows.getAll()).map(window => window.id));
    const navigations: chrome.webNavigation.WebNavigationBaseCallbackDetails[] = [];

    const record = (details: chrome.webNavigation.WebNavigationBaseCallbackDetails) => {
        if (details.frameId === 0) {
            navigations.push(details);
        }
    };

    api.webNavigation.onBeforeNavigate.addListener(record);

    try {
        const window = await api.windows.create({url: `${context.base}/fixture`, focused: true});
        assert(window?.id !== undefined && window.tabs?.[0]?.id !== undefined, "Expected a dedicated test window");
        const currentTabId = window.tabs[0].id;
        const other = await api.tabs.create({windowId: window.id, url: `${context.base}/fixture`, active: false});
        assert(other.id !== undefined, "Expected an inactive target tab");
        await api.windows.update(window.id, {focused: true});
        await api.tabs.update(currentTabId, {active: true});
        const beforeTabs = await api.tabs.query({});
        const beforeWindows = await api.windows.getAll();
        const text = `addon browser ${destination} café & + ${Date.now()}`;
        await invoke(text, other.id);

        const matches = await waitFor(async () => navigations.filter(event => {
            try {
                return [...new URL(event.url).searchParams.values()].includes(text);
            } catch {
                return false;
            }
        }), events => events.length > 0, `search navigation to ${destination}`);

        const navigation = matches[0];

        if (expectedHost) {
            assert(new URL(navigation.url).hostname === expectedHost, `Selected engine was not used: ${navigation.url}`);
        }

        const target = await api.tabs.get(navigation.tabId);
        const afterTabs = await api.tabs.query({});
        const afterWindows = await api.windows.getAll();
        const createsTab = destination === "new-tab" || destination === "new-window";
        assert(afterTabs.length === beforeTabs.length + Number(createsTab), `Wrong tab count for ${destination}`);
        assert(afterWindows.length === beforeWindows.length + Number(destination === "new-window"), `Wrong window count for ${destination}`);

        if (createsTab) {
            assert(!beforeTabs.some(tab => tab.id === target.id), "Search must use a newly created tab");
        } else {
            assert(target.id === (destination === "tab" ? other.id : currentTabId), `Search navigated the wrong ${destination} tab`);
        }

        assert((target.windowId === window.id) === (destination !== "new-window"), `Wrong destination window for ${destination}`);
    } finally {
        api.webNavigation.onBeforeNavigate.removeListener(record);

        for (const window of await api.windows.getAll()) {
            if (window.id !== undefined && !initialWindows.has(window.id)) {
                await api.windows.remove(window.id);
            }
        }
    }
}
