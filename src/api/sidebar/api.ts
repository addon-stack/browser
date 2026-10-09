import {browser} from "../browser";

import type {SidebarAction} from "../../types";

// Available in Firefox and Opera; Opera takes precedence when both are present.
export const sidebarAction = (): SidebarAction | undefined =>
    globalThis?.opr?.sidebarAction || globalThis?.browser?.sidebarAction;

export const isAvailableOperaSidebar = (): boolean => globalThis?.opr?.sidebarAction !== undefined;

// Chromium standard.
export const sidePanel = (): typeof chrome.sidePanel | undefined => browser().sidePanel;
