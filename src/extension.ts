import {browser} from "./browser";
import {callWithPromise} from "./utils";

type FetchProperties = chrome.extension.FetchProperties;

const extension = () => browser().extension;

// Methods
export const getBackgroundPage = (): Window | null => extension().getBackgroundPage();

export const getViews = (properties?: FetchProperties): Window[] => extension().getViews(properties);

export const isAllowedFileSchemeAccess = (): Promise<boolean> =>
    callWithPromise(cb => extension().isAllowedFileSchemeAccess(cb));

export const isAllowedIncognitoAccess = (): Promise<boolean> =>
    callWithPromise(cb => extension().isAllowedIncognitoAccess(cb));

export const setUpdateUrlData = (data: string): void => extension().setUpdateUrlData(data);
