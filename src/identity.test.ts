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
import {
    type BrowserHarness,
    type BrowserTestApi,
    createBrowserHarness,
    createBrowserMethod,
    createManifestFixture,
    installGlobals,
    type NavigatorTestValue,
} from "./testing";

const redirectUrl = "https://chrome-extension-id.chromiumapp.org/oauth?code=123";

describe("identity", () => {
    let harness: BrowserHarness;
    let restoreGlobals: () => void;

    beforeEach(() => {
        harness = createBrowserHarness({
            extensionId: "chrome-extension-id",
            manifest: createManifestFixture({manifest_version: 3}),
        });

        restoreGlobals = installGlobals({
            browser: undefined,
            chrome: harness.chrome,
            navigator: undefined,
            opr: undefined,
            safari: undefined,
        });
    });

    afterEach(() => {
        restoreGlobals();
        jest.restoreAllMocks();
    });

    const installChromeWithNavigator = (navigator: NavigatorTestValue): void => {
        restoreGlobals();

        restoreGlobals = installGlobals({
            browser: undefined,
            chrome: harness.chrome,
            navigator,
            opr: undefined,
            safari: undefined,
        });
    };

    const installFirefox = (): void => {
        restoreGlobals();

        restoreGlobals = installGlobals({
            browser: harness.browser,
            chrome: harness.chrome,
            navigator: undefined,
            opr: undefined,
            safari: undefined,
        });
    };

    test("should generate a redirect url through a configurable sync method", () => {
        harness.configurable.chrome.identity.getRedirectURL.setResult(
            "https://chrome-extension-id.chromiumapp.org/oauth"
        );

        expect(getIdentityRedirectUrl("oauth")).toBe("https://chrome-extension-id.chromiumapp.org/oauth");

        expect(harness.configurable.chrome.identity.getRedirectURL.calls).toMatchObject([
            {args: ["oauth"], callback: undefined, invocation: "sync"},
        ]);
    });

    test.each([2, 3] as const)("should launch a Chrome MV%s callback web auth flow", async manifestVersion => {
        harness.runtime.setManifest(createManifestFixture({manifest_version: manifestVersion}));
        harness.configurable.chrome.identity.launchWebAuthFlow.setResult(redirectUrl);
        const details = {interactive: true, url: "https://accounts.example/oauth"};

        await expect(launchWebAuthFlow(details)).resolves.toBe(redirectUrl);

        expect(harness.configurable.chrome.identity.launchWebAuthFlow.calls).toMatchObject([
            {
                args: [details],
                callback: expect.any(Function),
                callbackCalls: [[redirectUrl]],
                invocation: "callback",
            },
        ]);
    });

    test("should not use the Firefox Promise branch from a user-agent fallback alone", async () => {
        installChromeWithNavigator({
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0",
        });

        harness.configurable.chrome.identity.launchWebAuthFlow.setResult(redirectUrl);

        await expect(launchWebAuthFlow({url: "https://accounts.example/oauth"})).resolves.toBe(redirectUrl);

        expect(harness.configurable.chrome.identity.launchWebAuthFlow.calls[0]).toMatchObject({
            callback: expect.any(Function),
            invocation: "callback",
        });
    });

    test("should use the dual Promise path for a Firefox runtime", async () => {
        installFirefox();
        const firefoxRedirect = "https://extension-id.extensions.allizom.org/oauth?code=123";
        harness.configurable.browser.identity.launchWebAuthFlow.setResult(firefoxRedirect);

        const details = {
            redirect_uri: "https://extension-id.extensions.allizom.org/oauth",
            url: "https://accounts.example/oauth",
        };

        await expect(launchWebAuthFlow(details)).resolves.toBe(firefoxRedirect);

        expect(harness.configurable.browser.identity.launchWebAuthFlow.calls).toMatchObject([
            {args: [details], callback: undefined, callbackCalls: [], invocation: "promise"},
        ]);

        expect(harness.runtime.getBrowserInfo.calls).toHaveLength(1);
        expect(harness.configurable.chrome.identity.launchWebAuthFlow.calls).toHaveLength(0);
    });

    test("should support a promise-tolerant implementation that ignores a supplied callback", async () => {
        const method = createBrowserMethod<typeof chrome.identity.launchWebAuthFlow, string | undefined>({
            callback: "last",
            invocation: "promise-tolerant",
            name: "identity.launchWebAuthFlow",
        });

        method.setResult(redirectUrl);

        const chromeApi = {
            ...harness.chrome,
            identity: {...harness.chrome.identity, launchWebAuthFlow: method.api},
        } as BrowserTestApi;

        restoreGlobals();
        restoreGlobals = installGlobals({browser: undefined, chrome: chromeApi});

        await expect(launchWebAuthFlow({url: "https://accounts.example/oauth"})).resolves.toBe(redirectUrl);

        expect(method.calls).toMatchObject([
            {
                callback: expect.any(Function),
                callbackCalls: [],
                invocation: "promise-tolerant",
            },
        ]);
    });

    test("should reject launchWebAuthFlow through callback-scoped runtime.lastError", async () => {
        harness.configurable.chrome.identity.launchWebAuthFlow.failNext(new Error("Authorization flow failed"));

        await expect(launchWebAuthFlow({url: "https://accounts.example/oauth"})).rejects.toThrow(
            "Authorization flow failed"
        );

        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("should normalize getAuthToken callback token and granted scopes", async () => {
        harness.configurable.chrome.identity.getAuthToken.setImplementation(((
            _details: chrome.identity.TokenDetails,
            callback: (token: string, scopes: string[]) => void
        ) => {
            callback("access-token", ["email", "profile"]);
        }) as unknown as typeof chrome.identity.getAuthToken);

        await expect(getAuthToken({interactive: true})).resolves.toEqual({
            grantedScopes: ["email", "profile"],
            token: "access-token",
        });

        expect(harness.configurable.chrome.identity.getAuthToken.calls).toMatchObject([
            {
                args: [{interactive: true}],
                callbackCalls: [["access-token", ["email", "profile"]]],
                invocation: "hybrid",
            },
        ]);
    });

    test("should keep object-style getAuthToken results", async () => {
        const result = {grantedScopes: ["email"], token: "access-token"};
        harness.configurable.chrome.identity.getAuthToken.setResult(result);

        await expect(getAuthToken()).resolves.toBe(result);
        expect(harness.configurable.chrome.identity.getAuthToken.calls[0]?.args).toEqual([{}]);
    });

    test("should treat a null getAuthToken callback value as a token result", async () => {
        harness.configurable.chrome.identity.getAuthToken.setImplementation(((
            _details: chrome.identity.TokenDetails,
            callback: (token: null) => void
        ) => {
            callback(null);
        }) as unknown as typeof chrome.identity.getAuthToken);

        await expect(getAuthToken()).resolves.toEqual({grantedScopes: undefined, token: null});
    });

    test("should reject getAuthToken when runtime.lastError is set for the callback", async () => {
        harness.configurable.chrome.identity.getAuthToken.failNext(new Error("OAuth token unavailable"));

        await expect(getAuthToken()).rejects.toThrow("OAuth token unavailable");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test("should model the hybrid callback and thenable race", async () => {
        const callbackResult = {grantedScopes: ["email"], token: "callback-token"};
        const promiseResult = {grantedScopes: ["profile"], token: "promise-token"};

        harness.configurable.chrome.identity.getAuthToken.setImplementation(((
            _details: chrome.identity.TokenDetails,
            callback: (result: chrome.identity.GetAuthTokenResult) => void
        ) => {
            callback(callbackResult);

            return Promise.resolve(promiseResult);
        }) as unknown as typeof chrome.identity.getAuthToken);

        await expect(getAuthToken()).resolves.toBe(callbackResult);

        expect(harness.configurable.chrome.identity.getAuthToken.calls).toMatchObject([
            {callbackCalls: [[callbackResult]], invocation: "hybrid"},
        ]);
    });

    test("should remove a cached auth token", async () => {
        harness.configurable.chrome.identity.removeCachedAuthToken.setResult(undefined);
        const details = {token: "access-token"};

        await expect(removeCachedAuthToken(details)).resolves.toBeUndefined();
        expect(harness.configurable.chrome.identity.removeCachedAuthToken.calls[0]?.args).toEqual([details]);
    });

    test("should clear all cached auth tokens", async () => {
        harness.configurable.chrome.identity.clearAllCachedAuthTokens.setResult(undefined);

        await expect(clearAllCachedAuthTokens()).resolves.toBeUndefined();
        expect(harness.configurable.chrome.identity.clearAllCachedAuthTokens.calls).toHaveLength(1);
    });

    test("should get profile user info", async () => {
        const profile = {email: "user@example.com", id: "gaia-id"};
        harness.configurable.chrome.identity.getProfileUserInfo.setResult(profile);

        await expect(getProfileUserInfo({accountStatus: "ANY"})).resolves.toBe(profile);

        expect(harness.configurable.chrome.identity.getProfileUserInfo.calls[0]?.args).toEqual([
            {accountStatus: "ANY"},
        ]);
    });

    test("should get identity accounts", async () => {
        const accounts = [{id: "account-id"}];
        harness.configurable.chrome.identity.getAccounts.setResult(accounts);

        await expect(getIdentityAccounts()).resolves.toBe(accounts);
        expect(harness.configurable.chrome.identity.getAccounts.calls).toHaveLength(1);
    });

    test("should subscribe, emit and unsubscribe sign-in changes", async () => {
        const callback = jest.fn<(account: chrome.identity.AccountInfo, signedIn: boolean) => void>();
        const account = {id: "account-id"};

        const unsubscribe = onIdentitySignInChanged(callback);
        await harness.configurable.chrome.identity.onSignInChanged.emit(account, true);

        expect(callback).toHaveBeenCalledWith(account, true);
        expect(harness.configurable.chrome.identity.onSignInChanged.listenerCount()).toBe(1);
        unsubscribe();
        expect(harness.configurable.chrome.identity.onSignInChanged.listenerCount()).toBe(0);
    });
});
