# cookies

Documentation: [Chrome Cookies API](https://developer.chrome.com/docs/extensions/reference/cookies)

A promise-based wrapper for the Chrome `cookies` API.

## Methods

- [getCookie(details)](#getCookie)
- [getAllCookie(details)](#getAllCookie)
- [getAllCookieStores()](#getAllCookieStores)
- [getCookiePartitionKey(details)](#getCookiePartitionKey)
- [removeCookie(details)](#removeCookie)
- [setCookie(details)](#setCookie)

## Events

- [onCookieChanged(callback)](#onCookieChanged)

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
removeCookie(details: chrome.cookies.CookieDetails): Promise<chrome.cookies.CookieDetails>
```

Removes the cookie matching the specified details, returning the details of the removed cookie.

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
