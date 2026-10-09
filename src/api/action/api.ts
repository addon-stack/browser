import {browser} from "../browser";
import {isManifestVersion3} from "../runtime";

export type Action = typeof chrome.action;
type BrowserAction = typeof chrome.browserAction;

export const action = <T = Action | BrowserAction>() =>
    (isManifestVersion3() ? browser().action : browser().browserAction) as T;
