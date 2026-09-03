# URL patterns and host permissions

The harness has an internal match-pattern parser shared by `tabs.query()` and `permissions.contains()`. Application
code still calls the real `@addon-core/browser` wrappers. No matcher package, runner mock, or new production API is
required.

## Selecting tabs

```ts
import assert from "node:assert/strict";
import {containsPermissions, queryTabs} from "@addon-core/browser";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "@addon-core/browser/testing";

const harness = createBrowserHarness({
    tabs: [
        createTabFixture({id: 1, active: false, url: "http://127.0.0.1:62778/top.html"}),
        createTabFixture({id: 2, frozen: true, url: "https://shop.example.com/page#section"}),
        createTabFixture({id: 3, discarded: true, url: "https://shop.example.com/old"}),
    ],
    permissions: {origins: ["https://*.example.com/*"]},
});
const restore = installBrowserGlobals(harness, {profile: "chrome"});

try {
    const tabs = await queryTabs({
        url: ["http://127.0.0.1/*", "https://*.example.com/*"],
        status: "complete",
        discarded: false,
    });
    assert.deepEqual(tabs.map(tab => tab.id), [1, 2]);
    assert.equal(await containsPermissions({origins: ["https://shop.example.com/*"]}), true);
    assert.equal(await containsPermissions({origins: ["http://shop.example.com/*"]}), false);
} finally {
    restore();
}
```

`url` accepts one pattern or an array. Alternatives within the array are OR; other query fields are AND. An empty
array matches nothing. Inactive or frozen tabs are not excluded unless the corresponding filter is supplied.
Missing or malformed fixture URLs do not match. All patterns are validated before filtering, including for an empty
tab collection or an array beginning with `<all_urls>`.

## Supported grammar

The initial subset follows [Chrome's match-pattern structure](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns):

- Lowercase `http`, `https`, and hostless `file:///` patterns are supported. `*://` means HTTP or HTTPS only.
- `<all_urls>` means all three supported schemes in this kit, not every browser-specific URL scheme.
- Hosts may be exact, `*`, or `*.example.com`. A subdomain wildcard includes the apex and nested subdomains, but
  never `notexample.com` or `example.com.evil.test`. Hostname case, IDNA, IP spelling and trailing dots are normalized.
- An omitted port or `:*` matches any port. An explicit numeric port requires an explicit HTTP/HTTPS scheme;
  default ports are recognized; leading-zero port spellings fail explicitly. IPv4 and bracketed IPv6 are supported;
  subdomain wildcards on IPs are not.
- Paths are case-sensitive. Only `*` is a wildcard; punctuation such as `?`, `+`, `.`, `(` and `[` is literal.
  `/foo/*` also matches `/foo`. Path and query string (including a bare `?`) are matched together; the URL fragment is ignored.
- Patterns require a path. Whitespace, backslashes, fragments in patterns, credentials, malformed hosts/ports and
  unsupported schemes fail explicitly with the pattern and API/control name in the error.

Paths/queries are compared against the URL's serialized `pathname + search`. Use percent-encoded non-ASCII path
characters; raw non-ASCII patterns fail explicitly. The kit does not emulate Chromium's percent-decoding equivalence
rules: for example, it does not equate `%61` with `a` or normalize the case of percent escapes. This is a documented
boundary, not complete browser URL canonicalization. Unicode hostnames are supported independently of this limitation.

The same subset is used in every harness profile without reading `navigator`. It is not intended to reproduce each
vendor's scheme list, `file` aliases, restricted pages, or injection eligibility. `title` remains literal-only.

## Granted origins are pattern sets

`permissions.contains()` checks membership for named permissions and containment for origin patterns. Every requested
permission and origin must be covered. An individual requested origin must be contained by a granted pattern; the
kit does not synthesize new wildcard grants from multiple narrower entries.

For example, `https://*.example.com/*` covers `https://shop.example.com/*`, but the reverse is false. Scheme and port
scope also matter. Host-permission paths are required but ignored: a grant ending in `/one` covers a request ending
in `/two` on the same origin. This operation is deliberately separate from matching a concrete tab URL.

Only `harness.permissions` represents actual grants. Manifest `permissions`, `host_permissions`, and optional
declarations do not grant access automatically. `grant()`, `revoke()`, `set()`, `request()`, and `remove()` update this
state; `reset()` restores constructor values. Invalid origin batches are rejected before any mutation or event.

`getAll()` and permission events retain the original strings. Removal/revocation uses exact stored entries: revoking
`https://shop.example.com/*` does not subtract that site from `https://*.example.com/*`. There is no partial wildcard
subtraction, permission prompt, manifest eligibility check, or user site-access policy simulation.

## Controls and error handling

Both methods retain `calls`, `setResult()`, `setImplementation()`, `failNext()`, and `reset()`. Explicit overrides bypass
the default matcher, making unsupported/vendor-specific cases configurable. With default implementations, malformed
arguments throw for raw callback calls and reject for Promise calls; they do not create `runtime.lastError`.
Configured `failNext()` errors retain the normal callback-scoped `lastError` behavior.

For install/activation tests, emit `harness.runtime.events.onInstalled`, and let your application handler return its
Promise so `emit()` can await it. Configure CSS/JS results through `harness.scripting`; the kit does not execute scripts.
To verify CSS-before-JS, hold the CSS implementation until the test releases it, assert that `executeScript.calls` is
still empty, then release and await dispatch. Call history order alone does not prove the application awaited CSS.

## Real-browser check

After building, contributors can compare selected queries and permission cases with a local Chromium/Chrome for
Testing executable:

```sh
npm run build
npm run test:browser-match-patterns -- "/absolute/path/to/chrome-for-testing"
```

The script uses a temporary MV3 extension/profile and loopback HTTP server, compares the real browser with the built
harness, and removes its temporary files. It needs no automation package and is separate from the normal unit tests.
It requires the full Chrome for Testing or Chromium executable, not regular Google Chrome or `chrome-headless-shell`.
The launcher verifies the browser's `--version` before starting the smoke. A dedicated CI job runs it automatically,
including before release. See [contributor setup and troubleshooting](../../CONTRIBUTING.md#browser-match-pattern-smoke).
This focused smoke does not establish complete Chrome, Firefox, or Safari parity.
