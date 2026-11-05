import {requireApiMethod} from "../../internal/api-method";
import {browser} from "../browser";
import {callWithPromise} from "../utils";

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
    callWithPromise(cb => requireApiMethod(cookies(), "cookies", "getPartitionKey")(details, result => cb(result?.partitionKey)));

/** Normalizes an absent native removal result to null; preserves returned cookie details. */
export const removeCookie = async (details: CookieDetails): Promise<CookieDetails | null> =>
    (await callWithPromise<CookieDetails | null | undefined>(cb => cookies().remove(details, cb))) ?? null;

export const setCookie = (details: SetDetails): Promise<Cookie | null> =>
    callWithPromise(cb => cookies().set(details, cb));
