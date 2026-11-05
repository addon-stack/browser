# Safari compatibility

The package's TypeScript declarations cover several browser APIs. Individual methods can be missing even when their
namespace is exposed. Use a native method name with any `isAvailable…` helper:

```ts
isAvailableAction("getBadgeTextColor");
isAvailableTabs("discard");
isAvailableCookies("getPartitionKey");
isAvailableDnr("testMatchOutcome");
```

Only native function names in that namespace are accepted by TypeScript. The check does not invoke the method,
request permissions, validate arguments or promise that the operation will succeed. It returns `false` if the API
is absent or accessing it throws. A call without an argument still checks namespace presence only. Action and sidebar
checks use the same manifest/API selection as the corresponding wrappers.

## Method names

`ApiMethodName<T>` is a public type exported by `@addon-core/browser`. It extracts callable property names, including
optional methods and methods declared by either member of a union, while excluding event objects and constants:

```ts
import type {ApiMethodName} from "@addon-core/browser";

const method: ApiMethodName<typeof chrome.tabs> = "query";
```

## Adapted calls and results

- `createAlarm(name, info)` calls WebKit without a callback. Legacy WebKit returns `undefined` synchronously; newer
  WebKit can return a Promise. Both become `Promise<void>`, including synchronous exceptions and Promise rejections.
- `isActionEnabled(tabId)` retains its numeric public argument and passes `{tabId}` to WebKit. Chromium and Firefox
  keep their numeric native argument. Firefox's Promise-only method is called without a callback; other action
  methods retain callback handling.
- `getAlarm()` and `getCurrentTab()` normalize native `null` to their declared `undefined` absence result.
- `clearAlarm()` keeps `Promise<boolean>` and prefers a native boolean. Only WebKit checks existence before removal;
  legacy WebKit reports no result and uses that earlier, non-atomic observation. Chromium/Firefox do not pre-read;
  unexpected non-boolean results reject instead of being coerced to false.
- `clearAllAlarm()` reads the alarm list before deletion in every browser and returns whether it was nonempty,
  ignoring the native result. Chromium reports `true` for an empty collection; Firefox 159 and legacy WebKit report
  no result. The shared public contract returns `false` for an empty collection and `true` for a nonempty one.
  The read and deletion are separate operations, so concurrent changes can affect what is actually removed.
- `removeCookie()` preserves native details and normalizes `undefined`/`null` to `null`. Some browsers return the
  request details for an already absent cookie, so an object is not proof that a cookie previously existed.

WebKit is detected using the extension URL scheme (`safari-web-extension:`, legacy `safari-extension:` or standalone
`webkit-extension:`), without user-agent sniffing or retrying a mutating native operation. Callback support remains
in use for other methods. A general switch to Promise-only calls would not resolve missing methods or result shapes.

The APIs identified as missing inside otherwise exposed namespaces now reject with their native API name, for example
`The cookies.getPartitionKey API is not supported in this browser`. This includes the audited action, tabs, cookies,
permissions, runtime, DNR, i18n, extension and webRequest methods; it does not emulate those missing browser features.

## Breaking-change migration

BREAKING CHANGE: `removeCookie()` returns `Promise<chrome.cookies.CookieDetails | null>`. Consumers must handle an
absent native cookie removal result:

```ts
const cookie = await removeCookie({url: "https://example.com/", name: "session"});
if (cookie !== null) {
    console.log(cookie.name);
}
```

`clearAllAlarm()` still returns `Promise<boolean>`, but now returns `false` for an empty collection in every browser.
This changes Chromium's previous native `true` result and requires a breaking-change marker on the alarms commit.

`getBrowserInfo()` now rejects its Promise with an API-named error when unsupported, instead of throwing a synchronous
`TypeError`. The adapted missing-method errors are ordinary `Error` objects; do not depend on the old native `TypeError`
messages. These changes require a breaking-change release marker and a minor bump while the package remains on `0.x`.

## Verification

Build first, then run the production package in disposable extensions:

```sh
npm run build
npm run test:browser -- --browser chromium --api compatibility --binary /path/to/chrome-for-testing
npm run test:browser -- --browser firefox --api compatibility --binary /path/to/firefox
npm run test:webkit
```

The WebKit command requires macOS 15.4+ and the Xcode Command Line Tools. It prints the installed system WebKit and macOS
versions. Its native `WKWebExtensionController` uses nonpersistent extension/web data stores and minimal host window/tab
delegates. Extension APIs are not mocked. It checks alarm creation, lookup, repeat schedules, repeated conditional
creation, deletion, action state, absent results, method capabilities and callback errors.

This host does not establish Safari application UI behavior, iOS behavior, popup presentation, host-specific optional
features, actual alarm firing after the requested delay, or every public wrapper. Chromium/Firefox run the separate
`compatibility` suite through their real extension runners. Unit tests additionally cover legacy synchronous and newer
Promise-returning WebKit implementations. For upstream alarms changes, see
[WebKit commit 0756528](https://github.com/WebKit/WebKit/commit/07565287df4a952e02a052d06125123d24ffcebd).

## Verification snapshot — 2026-11-05

Runtime: system WebKit **22625.2.8.11.9**, macOS **27.2**, standalone native host; Chromium **153.0.8010.12** and
Firefox **159.0** in disposable extension profiles. This is not a Safari application UI or iOS test.

| Category | Evidence and scope |
| --- | --- |
| Runtime-tested adaptations | Alarm creation/get/getAll/removal, one-shot and repeating schedules, a second conditional creation preserving `scheduledTime`, action enable/disable/isEnabled, badge text, current-tab and cookie absence normalization, callback errors. |
| Observed missing methods in this WebKit build | `action.getBadgeTextColor/setBadgeTextColor/getUserSettings`; `tabs.discard/highlight/group/ungroup/getZoomSettings/setZoomSettings`; `cookies.getPartitionKey`; `permissions.addHostAccessRequest/removeHostAccessRequest`; `runtime.getBrowserInfo/getContexts/getPackageDirectoryEntry/requestUpdateCheck/restart/restartAfterDelay`; DNR `getAvailableStaticRuleCount/getDisabledRuleIds/testMatchOutcome/updateStaticRules`; `i18n.detectLanguage`; `extension.setUpdateUrlData`; `webRequest.handlerBehaviorChanged`. These observations depend on permissions, manifest and host/build. |
| Context/permission-limited absence | `runtime.connectNative` is absent without a `nativeMessaging` permission request. Legacy `tabs.executeScript/insertCSS/removeCSS` are absent in this MV3 fixture; the wrappers select `scripting` in MV3. These observations do not establish Safari-wide absence. |
| Source-only / unit checks | Complete wrapper argument and event behavior is not established by callable presence. Guards and newer Promise-returning WebKit creation are covered by unit tests; upstream alarms changes were checked in WebKit source. |
| Remaining gaps | Actual delayed alarm firing, every wrapper's successful runtime behavior and errors, all options/result fields, event payloads, popup/user-gesture UI, iOS, and optional APIs controlled by host/build flags. |

The missing-method observations above came from a separate native audit with the relevant permissions granted,
including `webRequest`. A namespace absent from a differently configured host must not be labelled an unsupported
Safari API without further investigation. Automatically recorded observations and human-reviewed findings are
separate concerns; a callable inventory is not a runtime conformance result for every wrapper.

## Saved observations and pilot CI

`npm run test:webkit` writes `report.json` and `report.md` under the gitignored `.output/webkit/` directory, including
failures after runner startup. Override the directory with `--report-dir <path>`. Raw reports are not committed.

The report records system WebKit/macOS versions, the source revision and dirty flag, requested manifest permissions
and host permissions, **actually granted** permissions/origins, and scenario results. The inventory resolves native
method references from the production TypeScript source and enumerates callable properties of each exposed namespace,
including non-enumerable and inherited properties. Wrapper references are source observations, not proof of execution.

Each method has one of three states: `namespace-unavailable`, `method-unavailable` (namespace present), or
`method-present`. Namespace absence is not attributed to Safari itself: permissions, manifest, host and build flags
can all affect it. The fixture requests and grants `webRequest`, so its namespace is not withheld by a missing request.
Human findings about adapted incorrect calls, source-only checks and remaining gaps are maintained separately in
`tests/webkit/review.json`; they are never inferred from presence alone.

