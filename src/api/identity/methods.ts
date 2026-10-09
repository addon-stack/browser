import {browser} from "../browser";
import {callBrowserMethod, callWithPromise} from "../utils";

type AccountInfo = chrome.identity.AccountInfo;
type GetAuthTokenResult = chrome.identity.GetAuthTokenResult;
type InvalidTokenDetails = chrome.identity.InvalidTokenDetails;
type ProfileDetails = chrome.identity.ProfileDetails;
type ProfileUserInfo = chrome.identity.ProfileUserInfo;
type TokenDetails = chrome.identity.TokenDetails;

export interface LaunchWebAuthFlowDetails extends chrome.identity.WebAuthFlowDetails {
    /**
     * Authorization URL. Pass redirect_uri as a query parameter of this URL,
     * not as a separate property of the details object.
     */
    url: string;
}

type IdentityApi = typeof chrome.identity;
type GetAuthTokenCallback = (token?: string | GetAuthTokenResult | null, grantedScopes?: string[]) => void;

const identity = (): IdentityApi => browser().identity;

// Methods
export const getIdentityRedirectUrl = (path?: string): string => identity().getRedirectURL(path);

export const launchWebAuthFlow = (details: LaunchWebAuthFlowDetails): Promise<string | undefined> =>
    callBrowserMethod({
        callback: (api, done) => api.identity.launchWebAuthFlow(details, done),
        promise: api => api.identity.launchWebAuthFlow(details),
    });

export const getAuthToken = (details?: TokenDetails): Promise<GetAuthTokenResult> =>
    callWithPromise(cb => {
        const callback: GetAuthTokenCallback = (token, grantedScopes) => {
            cb(token !== null && typeof token === "object" ? token : {token, grantedScopes} as GetAuthTokenResult);
        };

        return identity().getAuthToken(details || {}, callback);
    });

export const removeCachedAuthToken = (details: InvalidTokenDetails): Promise<void> =>
    callWithPromise(cb => identity().removeCachedAuthToken(details, cb));

export const clearAllCachedAuthTokens = (): Promise<void> =>
    callWithPromise(cb => identity().clearAllCachedAuthTokens(cb));

export const getProfileUserInfo = (details?: ProfileDetails): Promise<ProfileUserInfo> =>
    callWithPromise(cb => identity().getProfileUserInfo(details || {}, cb));

/**
 * Chrome Dev channel only. Do not build stable product logic on this API.
 */
export const getIdentityAccounts = (): Promise<AccountInfo[]> => callWithPromise(cb => identity().getAccounts(cb));
