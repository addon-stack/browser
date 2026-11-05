import {browser} from "../browser";
import {getManifestVersion} from "../runtime";

export type Action = typeof chrome.action;
type BrowserAction = typeof chrome.browserAction;

export const actionNamespace = (): "action" | "browserAction" =>
    getManifestVersion() === 3 ? "action" : "browserAction";

export const action = <T = Action | BrowserAction>() =>
    (actionNamespace() === "action" ? browser().action : browser().browserAction) as T;
