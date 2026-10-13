import {canGetSidebarTitle, canSetSidebarIcon, canSetSidebarTitle, getActiveTab, getSidebarPath, getSidebarTitle, setSidebarIcon, setSidebarPath, setSidebarTitle} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "icon-and-title-contracts",
    async run() {
        assert(canSetSidebarIcon(), "Firefox must support changing the sidebar icon");
        const imageData = new ImageData(new Uint8ClampedArray(16 * 16 * 4).fill(255), 16, 16);
        await setSidebarIcon({imageData});
        const {id: tabId} = await getActiveTab();
        assert(tabId !== undefined, "A browser tab must exist");
        await setSidebarIcon({imageData, tabId});
        await rejects(() => setSidebarIcon({imageData, tabId: 2147483647}), "An invalid tab must reject");

        assert(canSetSidebarTitle() && canGetSidebarTitle(), "Icon checks must not affect title support");
        await setSidebarTitle("Global sidebar");
        assert(await getSidebarTitle() === "Global sidebar", "Global title must roundtrip");
        await setSidebarTitle("Tab sidebar", tabId);
        assert(await getSidebarTitle(tabId) === "Tab sidebar", "Tab title must roundtrip");
        await setSidebarPath("fixtures/panel.json", tabId);
        assert(await getSidebarPath(tabId) === "fixtures/panel.json", "Panel path must roundtrip");
    },
} satisfies BrowserScenario;
