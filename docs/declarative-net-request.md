# declarativeNetRequest

Documentation: [Chrome Declarative Net Request API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest),
[Firefox Declarative Net Request API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest),
[Safari content blocking](https://developer.apple.com/documentation/safariservices/blocking-content-with-your-safari-web-extension).

Declarative Net Request (DNR) lets the browser block or redirect requests and modify headers using
rules supplied by an extension. The browser applies those rules without invoking extension JavaScript
for each request. This module provides Promise-based native methods and an unsubscribe-based debug
subscription. Public function names use `Dnr`; the native namespace remains `declarativeNetRequest`.

## Methods

- [isAvailableDnr()](#isAvailableDnr)
- [getDnrDynamicRules()](#getDnrDynamicRules)
- [updateDnrDynamicRules()](#updateDnrDynamicRules)
- [getDnrSessionRules()](#getDnrSessionRules)
- [updateDnrSessionRules()](#updateDnrSessionRules)
- [getDnrEnabledRulesets()](#getDnrEnabledRulesets)
- [updateDnrEnabledRulesets()](#updateDnrEnabledRulesets)
- [getDnrDisabledRuleIds()](#getDnrDisabledRuleIds)
- [updateDnrStaticRules()](#updateDnrStaticRules)
- [getDnrAvailableStaticRuleCount()](#getDnrAvailableStaticRuleCount)
- [getDnrMatchedRules()](#getDnrMatchedRules)
- [setDnrExtensionActionOptions()](#setDnrExtensionActionOptions)
- [testDnrMatchOutcome()](#testDnrMatchOutcome)
- [getDnrRegexSupport()](#getDnrRegexSupport)

## Events

- [onDnrRuleMatchedDebug()](#onDnrRuleMatchedDebug)

## Permissions and browser support

Declare `declarativeNetRequest` or `declarativeNetRequestWithHostAccess`. The latter requires host
access for rule actions. Redirects and header changes also require appropriate host permissions;
Safari specifically requires `declarativeNetRequestWithHostAccess` for these actions, including
user-granted access to both the source and destination of redirects.

For example, a Manifest V3 extension operating on one site can declare:

```json
{
  "permissions": ["declarativeNetRequestWithHostAccess"],
  "host_permissions": ["https://example.com/*"]
}
```

Use the API from an extension context such as a background script or extension page.
Debugging has additional restrictions described below; the availability check does not verify them.

| Browser | Supported operations and differences |
| --- | --- |
| Chrome / Chromium | All thirteen methods and the debug event; individual features have different minimum versions. |
| Microsoft Edge / Opera | Chromium-based implementations; check the target browser version and individual methods. |
| Firefox | Dynamic/session rules, ruleset toggling, individual static rule toggling, available static count and regex support. `testMatchOutcome` requires `extensions.dnr.feedback = true`. No `getMatchedRules`, `setExtensionActionOptions` or `onRuleMatchedDebug`. |
| Safari / iOS Safari | Dynamic/session rules, ruleset toggling, regex support, matched-request history and action count options. No individual static rule toggling, available static count, hypothetical matching or debug event in the compatibility data. Rule actions and conditions have additional limits. |

See [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/webextensions/api/declarativeNetRequest.json)
and the [Edge API list](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/api-support).
Firefox added DNR in 113 and individual static rule toggling in 128. Dynamic/session `ruleIds` filters
require Chrome 111+, Firefox 127+ or Safari 18.5+. Safari added dynamic/session rules in 15.4 and action
count options in 16.4. Do not infer support for a particular operation from namespace presence alone.

## Types and native behavior

Arguments use `chrome.declarativeNetRequest` types supplied by `@types/chrome`. `DnrTestMatchOptions`
adds Firefox's `includeOtherExtensions` option; matched rules may include Firefox's `extensionId`.
These declarations are a cross-browser superset, not a promise that every field is supported by every
browser. Unsupported options, invalid rules, missing methods, permissions and quota failures retain
native errors. The wrappers do not retry, fall back to `webRequest`, or resolve a failed operation as a no-op.

`DnrRulesMatchedDetails` describes the different history results: Chromium provides `rule` metadata;
Safari provides `request.url`. The wrapper preserves the returned object. See the
[WebKit implementation](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/Extensions/API/Cocoa/WebExtensionAPIDeclarativeNetRequestCocoa.mm).

Dynamic rules persist across browser restarts and extension updates. Session rules are cleared at
browser shutdown or extension update. Static rule content comes from JSON files declared in the
manifest; toggling rules does not edit those files. Enabled static rulesets and individual disabled
static rules persist across browser restarts but reset on extension update.

A single dynamic/session update applies removals and additions atomically. Separate API calls are
not a transaction. Rule IDs are numeric and scoped to their ruleset; ruleset IDs are strings.
Browser quotas, supported regex syntax, rule priorities and action restrictions remain native.
`urlFilter` is DNR filter syntax, not a WebExtension match pattern. See the official API reference
for rule matching and limits rather than assuming identical behavior across browsers.

---

<a name="isAvailableDnr"></a>

### isAvailableDnr

```ts
isAvailableDnr(): boolean
```

Checks the current native namespace on each call. Returns `false` if the environment or namespace
is missing or access throws. It does not log, probe native operations or cache results.

```ts
import {getDnrDynamicRules, isAvailableDnr} from "@addon-core/browser";

if (isAvailableDnr()) {
    const rules = await getDnrDynamicRules();
    console.log(rules);
}
```

<a name="getDnrDynamicRules"></a>

### getDnrDynamicRules

```ts
getDnrDynamicRules(filter?: chrome.declarativeNetRequest.GetRulesFilter): Promise<chrome.declarativeNetRequest.Rule[]>
```

Returns dynamic rules, optionally restricted to `ruleIds`. Omitting the filter uses the native
no-filter overload. An empty native array remains empty.

```ts
import {getDnrDynamicRules} from "@addon-core/browser";

const rules = await getDnrDynamicRules({ruleIds: [1, 2]});
```

<a name="updateDnrDynamicRules"></a>

### updateDnrDynamicRules

```ts
updateDnrDynamicRules(options: chrome.declarativeNetRequest.UpdateRuleOptions): Promise<void>
```

Adds and removes dynamic rules atomically. Replace an existing rule by removing and adding its ID
in the same call. A failed validation leaves the existing rules unchanged.

```ts
import {updateDnrDynamicRules} from "@addon-core/browser";

await updateDnrDynamicRules({
    removeRuleIds: [1],
    addRules: [{
        id: 1, priority: 1,
        action: {type: "block"},
        condition: {urlFilter: "||example.com/ads/", resourceTypes: ["script", "image"]},
    }],
});
```

<a name="getDnrSessionRules"></a>

### getDnrSessionRules

```ts
getDnrSessionRules(filter?: chrome.declarativeNetRequest.GetRulesFilter): Promise<chrome.declarativeNetRequest.Rule[]>
```

Returns rules for the current browser session, optionally filtered by numeric IDs.

```ts
import {getDnrSessionRules} from "@addon-core/browser";

const rules = await getDnrSessionRules();
```

<a name="updateDnrSessionRules"></a>

### updateDnrSessionRules

```ts
updateDnrSessionRules(options: chrome.declarativeNetRequest.UpdateRuleOptions): Promise<void>
```

Adds/removes temporary session rules atomically, using the same options as dynamic updates.

```ts
import {updateDnrSessionRules} from "@addon-core/browser";

await updateDnrSessionRules({
    addRules: [{
        id: 1, priority: 1, action: {type: "block"},
        condition: {urlFilter: "||example.com/tracking/", resourceTypes: ["xmlhttprequest"]},
    }],
});

// Later in the same session:
await updateDnrSessionRules({removeRuleIds: [1]});
```

<a name="getDnrEnabledRulesets"></a>

### getDnrEnabledRulesets

```ts
getDnrEnabledRulesets(): Promise<string[]>
```

Returns enabled static ruleset IDs. It does not include dynamic or session rulesets.

```ts
import {getDnrEnabledRulesets} from "@addon-core/browser";

const ids = await getDnrEnabledRulesets();
```

<a name="updateDnrEnabledRulesets"></a>

### updateDnrEnabledRulesets

```ts
updateDnrEnabledRulesets(options: chrome.declarativeNetRequest.UpdateRulesetOptions): Promise<void>
```

Enables/disables static rulesets declared in `declarative_net_request.rule_resources`:

```json
{
  "declarative_net_request": {
    "rule_resources": [{"id": "tracking", "enabled": false, "path": "rules/tracking.json"}]
  }
}
```

`rules/tracking.json` must contain a JSON array of valid rules packaged with the extension.

```ts
import {updateDnrEnabledRulesets} from "@addon-core/browser";

await updateDnrEnabledRulesets({enableRulesetIds: ["tracking"]});
```

<a name="getDnrDisabledRuleIds"></a>

### getDnrDisabledRuleIds

```ts
getDnrDisabledRuleIds(options: chrome.declarativeNetRequest.GetDisabledRuleIdsOptions): Promise<number[]>
```

Returns individually disabled rule IDs for a declared static ruleset. Chromium and Firefox 128+;
not available in Safari.

```ts
import {getDnrDisabledRuleIds} from "@addon-core/browser";

const ids = await getDnrDisabledRuleIds({rulesetId: "tracking"});
```

<a name="updateDnrStaticRules"></a>

### updateDnrStaticRules

```ts
updateDnrStaticRules(options: chrome.declarativeNetRequest.UpdateStaticRulesOptions): Promise<void>
```

Enables/disables individual rules inside a static ruleset. It cannot add or edit static rules,
and enabling a rule does not enable its parent ruleset. Chromium and Firefox 128+; not Safari.

```ts
import {updateDnrStaticRules} from "@addon-core/browser";

await updateDnrStaticRules({rulesetId: "tracking", disableRuleIds: [1], enableRuleIds: [2]});
```

<a name="getDnrAvailableStaticRuleCount"></a>

### getDnrAvailableStaticRuleCount

```ts
getDnrAvailableStaticRuleCount(): Promise<number>
```

Returns the browser's available static rule allowance. This is not the remaining dynamic/session
quota and does not guarantee that a later ruleset update succeeds. Not available in Safari.

```ts
import {getDnrAvailableStaticRuleCount} from "@addon-core/browser";

const available = await getDnrAvailableStaticRuleCount();
```

<a name="getDnrMatchedRules"></a>

### getDnrMatchedRules

```ts
getDnrMatchedRules(filter?: chrome.declarativeNetRequest.MatchedRulesFilter): Promise<DnrRulesMatchedDetails>
```

Returns recent matched-rule history, optionally filtered by `tabId` or `minTimeStamp`. Requires
`declarativeNetRequestFeedback` or an `activeTab` grant for the specified tab. Native call quotas
and history retention apply; this is not an exhaustive traffic log. Unsupported in Firefox.

```ts
import {getDnrMatchedRules} from "@addon-core/browser";

const result = await getDnrMatchedRules();
for (const info of result.rulesMatchedInfo) {
    if ("rule" in info) {
        console.log(info.rule.ruleId, info.rule.rulesetId); // Chromium
    } else {
        console.log(info.request.url); // Safari
    }
}
```

<a name="setDnrExtensionActionOptions"></a>

### setDnrExtensionActionOptions

```ts
setDnrExtensionActionOptions(options: chrome.declarativeNetRequest.ExtensionActionOptions): Promise<void>
```

Configures displaying the action count as badge text and native per-tab count adjustments.
Use an extension with an action declared in its manifest. Chromium and Safari 16.4+; not Firefox.

```ts
import {setDnrExtensionActionOptions} from "@addon-core/browser";

await setDnrExtensionActionOptions({displayActionCountAsBadgeText: true});
```

<a name="testDnrMatchOutcome"></a>

### testDnrMatchOutcome

```ts
testDnrMatchOutcome(
    request: chrome.declarativeNetRequest.TestMatchRequestDetails,
    options?: DnrTestMatchOptions
): Promise<chrome.declarativeNetRequest.TestMatchOutcomeResult>
```

Evaluates a hypothetical request without issuing it. This does not verify a real network response.
Chrome restricts this debugging method to unpacked extensions. Firefox requires the
`extensions.dnr.feedback` preference to be enabled; it is disabled by default. Safari does not support it.

```ts
import {testDnrMatchOutcome} from "@addon-core/browser";

const outcome = await testDnrMatchOutcome({url: "https://example.com/ads/banner.js", type: "script"});
console.log(outcome.matchedRules);
```

Only Firefox supports the second argument. The wrapper forwards it unchanged using the native
Promise overload; Chromium rejects it. Rules from other extensions may include `extensionId`.

```ts
import {testDnrMatchOutcome} from "@addon-core/browser";

// Firefox with extensions.dnr.feedback enabled:
const outcome = await testDnrMatchOutcome(
    {url: "https://example.com/", type: "main_frame"},
    {includeOtherExtensions: true},
);
```

<a name="getDnrRegexSupport"></a>

### getDnrRegexSupport

```ts
getDnrRegexSupport(options: chrome.declarativeNetRequest.RegexOptions): Promise<chrome.declarativeNetRequest.IsRegexSupportedResult>
```

Wraps native `isRegexSupported`, which returns an object, not a boolean. A regular expression that
the browser does not support returns `{isSupported: false, reason: ...}`; invocation errors still
reject. Regex syntax and resource limits differ between browsers.

```ts
import {getDnrRegexSupport} from "@addon-core/browser";

const support = await getDnrRegexSupport({regex: "^https://example\\.com/", requireCapturing: false});
if (!support.isSupported) {
    console.log(support.reason);
}
```

<a name="onDnrRuleMatchedDebug"></a>

### onDnrRuleMatchedDebug

```ts
onDnrRuleMatchedDebug(callback: (info: chrome.declarativeNetRequest.MatchedRuleInfoDebug) => void): () => void
```

Subscribes to Chromium's native debug event. Requires `declarativeNetRequestFeedback` and an unpacked
extension. This is a development diagnostic, not a production request listener. Firefox does not expose
this event even with its feedback preference enabled; Safari's compatibility data does not list support.
Check the member when targeting multiple browsers. Missing events retain native subscription failures.

```ts
import {browser, isAvailableDnr, onDnrRuleMatchedDebug} from "@addon-core/browser";

if (isAvailableDnr() && browser().declarativeNetRequest.onRuleMatchedDebug) {
    const unsubscribe = onDnrRuleMatchedDebug(({rule, request}) => {
        console.log(rule.ruleId, rule.rulesetId, request.url);
    });

    // When the subscription is no longer needed:
    unsubscribe();
}
```

The callback receives the original native payload and may be asynchronous. Shared listener utilities
log callback exceptions and rejected Promises. Cleanup is independent for each subscription and can be
called more than once.
