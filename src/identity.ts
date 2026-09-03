import {browser} from "./browser";
import {BrowserGuessSource, BrowserName, guessBrowser, isBrowser} from "./browser-detection";
import {callWithPromise, checkLastError, handleListener} from "./utils";

type AccountInfo = chrome.identity.AccountInfo;
type GetAuthTokenResult = chrome.identity.GetAuthTokenResult;
type InvalidTokenDetails = chrome.identity.InvalidTokenDetails;
type ProfileDetails = chrome.identity.ProfileDetails;
type ProfileUserInfo = chrome.identity.ProfileUserInfo;
type TokenDetails = chrome.identity.TokenDetails;

export interface LaunchWebAuthFlowDetails extends chrome.identity.WebAuthFlowDetails {
    /**
     * Firefox-only redirect URI override. Supported in Firefox 63+; loopback redirect URIs are supported in Firefox 86+.
     */
    redirect_uri?: string;
}

type IdentityApi = typeof chrome.identity;
type GetAuthTokenCallback = (token?: string | GetAuthTokenResult | null, grantedScopes?: string[]) => void;

const identity = (): IdentityApi => browser().identity;

// Methods
export const getIdentityRedirectUrl = (path?: string): string => identity().getRedirectURL(path);

export const launchWebAuthFlow = async (details: LaunchWebAuthFlowDetails): Promise<string | undefined> => {
    const browserGuess = await guessBrowser();

    const isFirefoxRuntime =
        isBrowser(browserGuess, BrowserName.Firefox) && browserGuess.source === BrowserGuessSource.RuntimeBrowserInfo;

    return callWithPromise(cb => {
        if (isFirefoxRuntime) {
            return identity().launchWebAuthFlow(details);
        }

        return identity().launchWebAuthFlow(details, cb);
    });
};

export const getAuthToken = (details?: TokenDetails): Promise<GetAuthTokenResult> => {
    return new Promise<GetAuthTokenResult>((resolve, reject) => {
        const getToken = identity().getAuthToken as unknown as (
            details: TokenDetails,
            callback: GetAuthTokenCallback
        ) => undefined | Promise<GetAuthTokenResult>;

        const callback: GetAuthTokenCallback = (token, grantedScopes) => {
            try {
                checkLastError();

                if (token !== null && typeof token === "object") {
                    resolve(token);

                    return;
                }

                resolve({token, grantedScopes} as GetAuthTokenResult);
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
