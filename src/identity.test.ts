import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";
import {
    clearAllCachedAuthTokens,
    getAuthToken,
    getIdentityAccounts,
    getIdentityRedirectUrl,
    getProfileUserInfo,
    launchWebAuthFlow,
    onIdentitySignInChanged,
    removeCachedAuthToken,
} from "./identity";

describe("identity", () => {
    let originalBrowser: any;
    let originalChrome: any;

    beforeEach(() => {
        originalBrowser = globalThis.browser;
        originalChrome = globalThis.chrome;

        delete (globalThis as any).browser;
        delete (globalThis as any).chrome;
    });

    afterEach(() => {
        (globalThis as any).browser = originalBrowser;
        globalThis.chrome = originalChrome;
        jest.resetAllMocks();
    });

    const setChromeIdentity = (
        identity: Partial<typeof chrome.identity>,
        lastError?: chrome.runtime.LastError
    ): void => {
        globalThis.chrome = {
            identity,
            runtime: {
                id: "chrome-extension-id",
                lastError,
            },
        } as any;
    };

    const createEvent = () => {
        const addListener = jest.fn();
        const removeListener = jest.fn();

        return {addListener, removeListener};
    };

    test("should generate a redirect url", () => {
        const getRedirectURL = jest.fn((path?: string) => `https://chrome-extension-id.chromiumapp.org/${path}`);
        setChromeIdentity({getRedirectURL});

        expect(getIdentityRedirectUrl("oauth")).toBe("https://chrome-extension-id.chromiumapp.org/oauth");
        expect(getRedirectURL).toHaveBeenCalledWith("oauth");
    });

    test("should launch a Chrome promise web auth flow", async () => {
        const launchWebAuthFlowMock = jest.fn((_details: chrome.identity.WebAuthFlowDetails) =>
            Promise.resolve("https://chrome-extension-id.chromiumapp.org/oauth?code=123")
        );
        setChromeIdentity({launchWebAuthFlow: launchWebAuthFlowMock as any});

        await expect(launchWebAuthFlow({url: "https://accounts.example/oauth", interactive: true})).resolves.toBe(
            "https://chrome-extension-id.chromiumapp.org/oauth?code=123"
        );
        expect(launchWebAuthFlowMock).toHaveBeenCalledWith({url: "https://accounts.example/oauth", interactive: true});
    });

    test("should launch a Firefox promise-only web auth flow without callback", async () => {
        const launchWebAuthFlowMock = jest.fn((_details: any) =>
            Promise.resolve("https://extension-id.extensions.allizom.org/oauth?code=123")
        );
        (globalThis as any).browser = {
            identity: {
                launchWebAuthFlow: launchWebAuthFlowMock,
            },
            runtime: {
                id: "firefox-extension-id",
                lastError: undefined,
            },
        };

        await expect(
            launchWebAuthFlow({
                redirect_uri: "https://extension-id.extensions.allizom.org/oauth",
                url: "https://accounts.example/oauth",
            })
        ).resolves.toBe("https://extension-id.extensions.allizom.org/oauth?code=123");
        expect(launchWebAuthFlowMock).toHaveBeenCalledWith({
            redirect_uri: "https://extension-id.extensions.allizom.org/oauth",
            url: "https://accounts.example/oauth",
        });
    });

    test("should reject launchWebAuthFlow when the browser promise rejects", async () => {
        const errorMessage = "Authorization flow failed";
        setChromeIdentity({
            launchWebAuthFlow: jest.fn((_details: chrome.identity.WebAuthFlowDetails) =>
                Promise.reject(new Error(errorMessage))
            ),
        } as any);

        await expect(launchWebAuthFlow({url: "https://accounts.example/oauth"})).rejects.toThrow(errorMessage);
    });

    test("should normalize getAuthToken callback token and granted scopes", async () => {
        const getAuthTokenMock = jest.fn((_details: chrome.identity.TokenDetails, cb: any) =>
            cb("access-token", ["email", "profile"])
        );
        setChromeIdentity({getAuthToken: getAuthTokenMock as any});

        await expect(getAuthToken({interactive: true})).resolves.toEqual({
            grantedScopes: ["email", "profile"],
            token: "access-token",
        });
        expect(getAuthTokenMock).toHaveBeenCalledWith({interactive: true}, expect.any(Function));
    });

    test("should keep object-style getAuthToken results", async () => {
        const result = {grantedScopes: ["email"], token: "access-token"};
        const getAuthTokenMock = jest.fn((_details: chrome.identity.TokenDetails, cb: any) => cb(result));
        setChromeIdentity({getAuthToken: getAuthTokenMock as any});

        await expect(getAuthToken()).resolves.toBe(result);
        expect(getAuthTokenMock).toHaveBeenCalledWith({}, expect.any(Function));
    });

    test("should reject getAuthToken when runtime lastError is set", async () => {
        const errorMessage = "OAuth token unavailable";
        setChromeIdentity(
            {
                getAuthToken: jest.fn((_details: chrome.identity.TokenDetails, cb: any) => cb(undefined)),
            } as any,
            {message: errorMessage}
        );

        await expect(getAuthToken()).rejects.toThrow(errorMessage);
    });

    test("should remove a cached auth token", async () => {
        const removeCachedAuthTokenMock = jest.fn((_details: chrome.identity.InvalidTokenDetails, cb: () => void) =>
            cb()
        );
        setChromeIdentity({removeCachedAuthToken: removeCachedAuthTokenMock as any});

        await expect(removeCachedAuthToken({token: "access-token"})).resolves.toBeUndefined();
        expect(removeCachedAuthTokenMock).toHaveBeenCalledWith({token: "access-token"}, expect.any(Function));
    });

    test("should clear all cached auth tokens", async () => {
        const clearAllCachedAuthTokensMock = jest.fn((cb: () => void) => cb());
        setChromeIdentity({clearAllCachedAuthTokens: clearAllCachedAuthTokensMock as any});

        await expect(clearAllCachedAuthTokens()).resolves.toBeUndefined();
        expect(clearAllCachedAuthTokensMock).toHaveBeenCalledWith(expect.any(Function));
    });

    test("should get profile user info", async () => {
        const profile = {email: "user@example.com", id: "gaia-id"};
        const getProfileUserInfoMock = jest.fn((_details: chrome.identity.ProfileDetails, cb: any) => cb(profile));
        setChromeIdentity({getProfileUserInfo: getProfileUserInfoMock as any});

        await expect(getProfileUserInfo({accountStatus: "ANY"})).resolves.toBe(profile);
        expect(getProfileUserInfoMock).toHaveBeenCalledWith({accountStatus: "ANY"}, expect.any(Function));
    });

    test("should get identity accounts", async () => {
        const accounts = [{id: "account-id"}];
        const getAccountsMock = jest.fn((cb: any) => cb(accounts));
        setChromeIdentity({getAccounts: getAccountsMock as any});

        await expect(getIdentityAccounts()).resolves.toBe(accounts);
        expect(getAccountsMock).toHaveBeenCalledWith(expect.any(Function));
    });

    test("should subscribe to sign-in changes and unsubscribe", () => {
        const onSignInChangedEvent = createEvent();
        setChromeIdentity({onSignInChanged: onSignInChangedEvent as any});
        const callback = jest.fn();

        const unsubscribe = onIdentitySignInChanged(callback);

        expect(onSignInChangedEvent.addListener).toHaveBeenCalledWith(expect.any(Function));
        unsubscribe();
        expect(onSignInChangedEvent.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });
});
