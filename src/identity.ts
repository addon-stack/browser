import {browser} from "./browser";
import {callWithPromise, checkLastError, handleListener} from "./utils";

type AccountInfo = chrome.identity.AccountInfo;
type GetAuthTokenResult = chrome.identity.GetAuthTokenResult;
type InvalidTokenDetails = chrome.identity.InvalidTokenDetails;
type ProfileDetails = chrome.identity.ProfileDetails;
type ProfileUserInfo = chrome.identity.ProfileUserInfo;
type TokenDetails = chrome.identity.TokenDetails;

export interface LaunchWebAuthFlowDetails extends chrome.identity.WebAuthFlowDetails {
    redirect_uri?: string;
}

type IdentityApi = typeof chrome.identity;
type GetAuthTokenCallback = (token?: string | GetAuthTokenResult, grantedScopes?: string[]) => void;

const identity = (): IdentityApi => browser().identity;

// Methods
export const getIdentityRedirectUrl = (path?: string): string => identity().getRedirectURL(path);

export const launchWebAuthFlow = (details: LaunchWebAuthFlowDetails): Promise<string | undefined> =>
    callWithPromise(() => identity().launchWebAuthFlow(details));

export const getAuthToken = (details?: TokenDetails): Promise<GetAuthTokenResult> => {
    return new Promise<GetAuthTokenResult>((resolve, reject) => {
        const getToken = identity().getAuthToken as unknown as (
            details: TokenDetails,
            callback: GetAuthTokenCallback
        ) => undefined | Promise<GetAuthTokenResult>;

        const callback: GetAuthTokenCallback = (token, grantedScopes) => {
            try {
                checkLastError();

                if (typeof token === "object") {
                    resolve(token);

                    return;
                }

                resolve({token, grantedScopes});
            } catch (e) {
                reject(e);
            }
        };

        try {
            const result = getToken(details || {}, callback);

            if (result && typeof result.then === "function") {
                result.then(resolve, reject);
            }
        } catch (e) {
            reject(e);
        }
    });
};

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

// Events
export const onIdentitySignInChanged = (
    callback: Parameters<typeof chrome.identity.onSignInChanged.addListener>[0]
): (() => void) => {
    return handleListener(identity().onSignInChanged, callback);
};
