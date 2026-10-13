import {canGetSidebarTitle, canSetSidebarIcon, canSetSidebarTitle, getSidebarPath, getSidebarTitle, isAvailableSidebar, setSidebarIcon, setSidebarPath, setSidebarTitle, SidebarError} from "../../../../dist/index.js";
import {assert} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "unsupported-icon-and-title",
    async run() {
        assert(typeof document === "undefined", "Chromium must run this scenario in a service worker");
        assert(isAvailableSidebar(), "The sidePanel namespace must be available");
        assert(!canSetSidebarIcon(), "sidePanel must not claim icon support");
        assert(!canSetSidebarTitle() && !canGetSidebarTitle(), "sidePanel must not claim title support");

        for (const invoke of [
            () => setSidebarIcon({path: "icon.png"}),
            () => setSidebarIcon({path: "icon.png", tabId: 0}),
            () => setSidebarTitle("Title"),
            () => getSidebarTitle(),
        ]) {
            const error = await invoke().then(() => undefined, reason => reason);
            assert(error instanceof SidebarError, "Unsupported operations must reject with SidebarError");
        }

        await setSidebarPath("fixtures/panel.json");
        assert(await getSidebarPath() === "fixtures/panel.json", "Side panel path operations must remain available");
    },
} satisfies BrowserScenario;
