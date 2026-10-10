import {browser} from "../browser";
import {callWithPromise} from "../utils";

import type {TabGroup} from "./types";

type QueryInfo = chrome.tabGroups.QueryInfo;
type UpdateProperties = chrome.tabGroups.UpdateProperties;
type MoveProperties = chrome.tabGroups.MoveProperties;

const tabGroups = () => browser().tabGroups;

export const getTabGroup = (groupId: number): Promise<TabGroup> =>
    callWithPromise(cb => tabGroups().get(groupId, cb));

export const queryTabGroups = (queryInfo: QueryInfo = {}): Promise<TabGroup[]> =>
    callWithPromise(cb => tabGroups().query(queryInfo, cb));

export const updateTabGroup = (groupId: number, properties: UpdateProperties): Promise<TabGroup | undefined> =>
    callWithPromise(cb => tabGroups().update(groupId, properties, cb));

export const moveTabGroup = (groupId: number, properties: MoveProperties): Promise<TabGroup | undefined> =>
    callWithPromise(cb => tabGroups().move(groupId, properties, cb));
