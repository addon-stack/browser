import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type Cookie = chrome.cookies.Cookie;
type CookieStore = chrome.cookies.CookieStore;
type CookiePartitionKey = chrome.cookies.CookiePartitionKey;
type FrameDetails = chrome.cookies.FrameDetails;
type CookieDetails = chrome.cookies.CookieDetails;
type GetAllDetails = chrome.cookies.GetAllDetails;
type SetDetails = chrome.cookies.SetDetails;

const cookies = () => browser().cookies;

// Methods
export const getCookie = (details: CookieDetails): Promise<Cookie | null> =>
    callWithPromise(cb => cookies().get(details, cb));

export const getAllCookie = (details?: GetAllDetails): Promise<Cookie[]> =>
    callWithPromise(cb => cookies().getAll(details || {}, cb));

export const getAllCookieStores = (): Promise<CookieStore[]> => callWithPromise(cb => cookies().getAllCookieStores(cb));

export const getCookiePartitionKey = (details: FrameDetails): Promise<CookiePartitionKey> =>
    callWithPromise(cb => cookies().getPartitionKey(details, result => cb(result.partitionKey)));

export const removeCookie = (details: CookieDetails): Promise<CookieDetails> =>
    callWithPromise(cb => cookies().remove(details, cb));

export const setCookie = (details: SetDetails): Promise<Cookie | null> =>
    callWithPromise(cb => cookies().set(details, cb));

// Events
export const onCookieChanged = (callback: Parameters<typeof chrome.cookies.onChanged.addListener>[0]): (() => void) => {
    return handleListener(cookies().onChanged, callback);
};
