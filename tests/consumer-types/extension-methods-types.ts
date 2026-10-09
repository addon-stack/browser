import {getBackgroundPage, getViews, isAllowedFileSchemeAccess, isAllowedIncognitoAccess, setUpdateUrlData} from "@addon-core/browser";

type FetchProperties = chrome.extension.FetchProperties;

const methods = {getBackgroundPage, getViews, isAllowedFileSchemeAccess, isAllowedIncognitoAccess, setUpdateUrlData};

type Expected = {
    getBackgroundPage: () => Window | null;
    getViews: (properties?: FetchProperties) => Window[];
    isAllowedFileSchemeAccess: () => Promise<boolean>;
    isAllowedIncognitoAccess: () => Promise<boolean>;
    setUpdateUrlData: (data: string) => void;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];
