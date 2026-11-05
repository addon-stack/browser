# cookies

Documentation: [Chrome Cookies API](https://developer.chrome.com/docs/extensions/reference/cookies)

A promise-based wrapper for the Chrome `cookies` API.

## Methods

- [isAvailableCookies()](#isAvailableCookies)
- [getCookie(details)](#getCookie)
- [getAllCookie(details)](#getAllCookie)
- [getAllCookieStores()](#getAllCookieStores)
- [getCookiePartitionKey(details)](#getCookiePartitionKey)
- [removeCookie(details)](#removeCookie)
- [setCookie(details)](#setCookie)

## Events

- [onCookieChanged(callback)](#onCookieChanged)

<a name="isAvailableCookies"></a>

### isAvailableCookies

```ts
isAvailableCookies(method?: ApiMethodName<typeof chrome.cookies>): boolean
```

The optional `method` is a native function name, for example `isAvailableCookies("get")`.
Import the public `ApiMethodName` type from `@addon-core/browser` for your own typed helpers.
This checks callable presence without invoking the method; permissions and argument support still require handling.

Returns `true` when the `cookies` namespace is present on the API selected by `browser()` in the current context.
Returns `false` if the namespace or WebExtension environment is absent, or if accessing it throws.
The check is synchronous, does not log, and reads the current API on every call without caching.
Without an argument, it checks namespace presence only. Pass a native method name to also check that it is callable.
Neither form verifies permissions, argument support, or a successful operation. See [method availability](safari.md).

```ts
import {isAvailableCookies} from "@addon-core/browser";

if (isAvailableCookies()) {
    // The namespace is present; handle operation-specific failures when using it.
}
```

<a name="getCookie"></a>

### getCookie

```
getCookie(details: chrome.cookies.CookieDetails): Promise<chrome.cookies.Cookie | null>
```

Retrieves the cookie matching the specified details, or `null` if not found.

<a name="getAllCookie"></a>

### getAllCookie

```
getAllCookie(details?: chrome.cookies.GetAllDetails): Promise<chrome.cookies.Cookie[]>
```

Retrieves all cookies that match the given filter details.

<a name="getAllCookieStores"></a>

### getAllCookieStores

```
getAllCookieStores(): Promise<chrome.cookies.CookieStore[]>
```

Retrieves all cookie stores accessible to the extension.

<a name="getCookiePartitionKey"></a>

### getCookiePartitionKey [MV3]

```
getCookiePartitionKey(details: chrome.cookies.FrameDetails): Promise<chrome.cookies.CookiePartitionKey>
```

Retrieves the partition key for the cookie associated with the given frame (Manifest V3 only).

<a name="removeCookie"></a>

### removeCookie

```
removeCookie(details: chrome.cookies.CookieDetails): Promise<chrome.cookies.CookieDetails | null>
```

Removes the cookie matching the specified details. Preserves returned native details and normalizes an absent result
(`null` or `undefined`) to `null`. Chromium can return details even when the cookie was already absent; this result
does not establish that a cookie existed. See the [migration notes](safari.md#breaking-change-migration).

<a name="setCookie"></a>

### setCookie

```
setCookie(details: chrome.cookies.SetDetails): Promise<chrome.cookies.Cookie | null>
```

Sets a cookie with the given details, returning the created cookie or `null` on failure.

<a name="onCookieChanged"></a>

### onCookieChanged

```
onCookieChanged(callback: (changeInfo: chrome.cookies.CookieChangeInfo) => void): () => void
```

Adds a listener that triggers when a cookie change event occurs.
