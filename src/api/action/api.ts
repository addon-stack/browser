import {browser} from "../browser";
import {getManifestVersion} from "../runtime";

export type Action = typeof chrome.action;
type BrowserAction = typeof chrome.browserAction;

export const action = <T = Action | BrowserAction>() =>
    (getManifestVersion() === 3 ? browser().action : browser().browserAction) as T;
