# identity

Documentation:

- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Firefox identity API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity)
- [Microsoft Edge extension API support](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support)

A promise-based wrapper for the WebExtension `identity` API. Chrome exposes the full API surface. Firefox, Edge, and Opera should use the portable OAuth flow with `getIdentityRedirectUrl()` and `launchWebAuthFlow()`. Safari does not support this API.

## Browser support notes

- Chrome: supports the full `chrome.identity` API, except the underlying `getAccounts()` API is Chrome Dev channel only. `launchWebAuthFlow()` uses the Promise form supported by Chrome 106+.
- Firefox: supports the portable `browser.identity.launchWebAuthFlow()` promise API and `getRedirectURL()`.
- Edge: use `launchWebAuthFlow()` for portable OAuth. `getAuthToken()` and the underlying `getAccounts()` API are officially unsupported even if feature detection sees the methods.
- Opera: supports the portable web auth flow in Chromium-based builds.
- Safari: Identity API is not supported.

## Manifest

For Chrome OAuth token helpers, add `identity` and the `oauth2` manifest section:

```json
{
  "permissions": ["identity"],
  "oauth2": {
    "client_id": "client-id.apps.googleusercontent.com",
    "scopes": ["profile", "email"]
  }
}
```

For profile email data, add `identity.email`:

```json
{
  "permissions": ["identity", "identity.email"]
}
```

Interactive authorization flows should be started from a user action, such as a button click.

## Methods

- [getIdentityRedirectUrl(path?)](#getIdentityRedirectUrl)
- [launchWebAuthFlow(details)](#launchWebAuthFlow)
- [getAuthToken(details?)](#getAuthToken)
- [removeCachedAuthToken(details)](#removeCachedAuthToken)
- [clearAllCachedAuthTokens()](#clearAllCachedAuthTokens)
- [getProfileUserInfo(details?)](#getProfileUserInfo)
- [getIdentityAccounts()](#getIdentityAccounts)

## Events

- [onIdentitySignInChanged(callback)](#onIdentitySignInChanged)

---

<a name="getIdentityRedirectUrl"></a>

### getIdentityRedirectUrl

```
getIdentityRedirectUrl(path?: string): string
```

Generates the extension redirect URL for an OAuth flow.

```ts
import {getIdentityRedirectUrl} from "@addon-core/browser";

const redirectUrl = getIdentityRedirectUrl("oauth");
```

In Chromium browsers this usually returns a URL like `https://<extension-id>.chromiumapp.org/oauth`.

<a name="launchWebAuthFlow"></a>

### launchWebAuthFlow

```
launchWebAuthFlow(details: LaunchWebAuthFlowDetails): Promise<string | undefined>
```

Starts a browser-managed OAuth flow and resolves with the final redirect URL. This is the recommended portable API for Firefox, Edge, Opera, and non-Google providers.

```ts
import {getIdentityRedirectUrl, launchWebAuthFlow} from "@addon-core/browser";

const redirectUrl = getIdentityRedirectUrl("oauth");
const url = new URL("https://accounts.example.com/oauth/authorize");
url.searchParams.set("redirect_uri", redirectUrl);

const responseUrl = await launchWebAuthFlow({
  interactive: true,
  url: url.toString(),
});
```

This wrapper uses the Promise form in all browsers. Firefox does not accept a callback for this API, and Chrome supports the Promise form for `identity.launchWebAuthFlow()` in current extension runtimes.

<a name="getAuthToken"></a>

### getAuthToken

```
getAuthToken(details?: chrome.identity.TokenDetails): Promise<chrome.identity.GetAuthTokenResult>
```

Gets a Chrome OAuth2 access token using the manifest `oauth2` configuration or the provided scopes. The wrapper always resolves to `{ token, grantedScopes }`, including callback-based Chrome runtimes that return those values as separate callback arguments.

```ts
import {getAuthToken} from "@addon-core/browser";

const {token} = await getAuthToken({interactive: true});
```

This method is Chrome-focused. In Edge, it is officially unsupported even if present.

<a name="removeCachedAuthToken"></a>

### removeCachedAuthToken

```
removeCachedAuthToken(details: chrome.identity.InvalidTokenDetails): Promise<void>
```

Removes an OAuth2 access token from Chrome's token cache.

<a name="clearAllCachedAuthTokens"></a>

### clearAllCachedAuthTokens

```
clearAllCachedAuthTokens(): Promise<void>
```

Clears all cached auth tokens and authorization state managed by the Identity API.

<a name="getProfileUserInfo"></a>

### getProfileUserInfo

```
getProfileUserInfo(details?: chrome.identity.ProfileDetails): Promise<chrome.identity.ProfileUserInfo>
```

Returns profile email and ID information. Requires the `identity.email` permission; otherwise Chrome returns empty fields.

<a name="getIdentityAccounts"></a>

### getIdentityAccounts

```
getIdentityAccounts(): Promise<chrome.identity.AccountInfo[]>
```

Returns accounts present in the Chrome profile. This API is Chrome Dev channel only and should not be used for stable product logic.

<a name="onIdentitySignInChanged"></a>

### onIdentitySignInChanged

```
onIdentitySignInChanged(callback: (account: chrome.identity.AccountInfo, signedIn: boolean) => void): () => void
```

Fires when the sign-in state changes for an account in the user's profile. Returns an unsubscribe function.
