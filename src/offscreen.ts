import {browser} from "./browser";
import {getContexts, getUrl} from "./runtime";
import {callWithPromise} from "./utils";

type CreateParameters = chrome.offscreen.CreateParameters;
type ExtensionContext = chrome.runtime.ExtensionContext;

const offscreen = () => browser().offscreen;

// Methods
export const closeOffscreen = (): Promise<void> => callWithPromise(cb => offscreen().closeDocument(cb));

export const createOffscreen = (parameters: CreateParameters): Promise<void> =>
    callWithPromise(cb => offscreen().createDocument(parameters, cb));

export const hasOffscreen = (): Promise<boolean> => callWithPromise(cb => offscreen().hasDocument(cb));

export const getOffscreenContext = async (): Promise<ExtensionContext | undefined> => {
    return (await getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"]}))[0];
};

export const getOffscreenUrl = async (): Promise<string | undefined> => {
    return (await getOffscreenContext())?.documentUrl;
};

export const getOffscreenPath = async (): Promise<string | undefined> => {
    const url = await getOffscreenUrl();

    if (!url) {
        return undefined;
    }

    const documentUrl = new URL(url);

    if (documentUrl.origin !== new URL(getUrl("")).origin) {
        return undefined;
    }

    return documentUrl.pathname;
};

export const hasOffscreenUrl = async (url: string): Promise<boolean> => {
    return (await getOffscreenUrl()) === url;
};

export const hasOffscreenPath = async (path: string): Promise<boolean> => {
    return (await getOffscreenPath()) === new URL(getUrl(path)).pathname;
};
