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

Several audited wrappers report unsupported methods using their native API name, for example
`The cookies.getPartitionKey API is not supported in this browser`. This includes the audited action, tabs, cookies,
permissions, runtime, DNR, i18n, extension and webRequest methods. Other wrappers preserve native errors, including
`moveTab()` and `moveTabs()` when `tabs.move` is absent. Missing browser features are not emulated.

## Breaking-change migration

`removeCookie()` returns `Promise<chrome.cookies.CookieDetails | null>`. Consumers must handle an
absent native cookie removal result:

```ts
const cookie = await removeCookie({url: "https://example.com/", name: "session"});
if (cookie !== null) {
    console.log(cookie.name);
}
```

`clearAllAlarm()` still returns `Promise<boolean>`, but now returns `false` for an empty collection in every browser.
This changes Chromium's previous native `true` result.

`getBrowserInfo()` now rejects its Promise with an API-named error when unsupported, instead of throwing a synchronous
`TypeError`. The adapted missing-method errors are ordinary `Error` objects; do not depend on the old native `TypeError`
messages.

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

<a name="verification-snapshot"></a>

## Verification snapshot — 2026-11-05

Chromium **153.0.8010.12** and Firefox **159.0** passed the compatibility suite in disposable extension profiles.
The native WebKit host passed all five scenarios in the following environments:

| Environment | macOS (build) | System WebKit | Source revision | Result |
| --- | --- | --- | --- | --- |
| Local host | 27.2 (26B123) | 22625.2.8.11.9 | `c71d61f4a68b` | 5/5 passed |
| CI `macos-15` | 15.8.2 (24H232) | 20621.3.11.11.3 | `c71d61f4a68b` | 5/5 passed |
| CI `macos-26` | 26.6.2 (25G83) | 21624.5.1.11.3 | `c71d61f4a68b` | 5/5 passed |

The CI results and report artifacts are available in the
[verified WebKit pilot push run on develop](https://github.com/addon-stack/browser/actions/runs/42112369083).
All three reports record revision `c71d61f4a68b` and a clean working tree.
These checks use a standalone native host and do not establish Safari application UI or iOS behavior.

| Category | Evidence and scope |
| --- | --- |
| Runtime-tested adaptations | Alarm creation/get/getAll/removal, one-shot and repeating schedules, a second conditional creation preserving `scheduledTime`, action enable/disable/isEnabled, badge text, current-tab and cookie absence normalization, callback errors. |
| Observed missing methods in WebKit 22625.2.8.11.9 | `action.getBadgeTextColor/setBadgeTextColor/getUserSettings`; `tabs.discard/highlight/group/ungroup/getZoomSettings/setZoomSettings`; `cookies.getPartitionKey`; `permissions.addHostAccessRequest/removeHostAccessRequest`; `runtime.getBrowserInfo/getContexts/getPackageDirectoryEntry/requestUpdateCheck/restart/restartAfterDelay`; DNR `getAvailableStaticRuleCount/getDisabledRuleIds/testMatchOutcome/updateStaticRules`; `i18n.detectLanguage`; `extension.setUpdateUrlData`; `webRequest.handlerBehaviorChanged`. These observations depend on permissions, manifest and host/build. |
| Version-dependent method presence | `tabs.move` was absent in WebKit 20621.3.11.11.3 and 21624.5.1.11.3, and callable in 22625.2.8.11.9. Presence does not verify successful execution. On builds where it is absent, `moveTab()` and `moveTabs()` reject with the native `TypeError`; use `isAvailableTabs("move")` to check callable presence. |
| Context/permission-limited absence | `runtime.connectNative` is absent without a `nativeMessaging` permission request. Legacy `tabs.executeScript/insertCSS/removeCSS` are absent in this MV3 fixture; the wrappers select `scripting` in MV3. These observations do not establish Safari-wide absence. |
| Source-only / unit checks | Complete wrapper argument and event behavior is not established by callable presence. Guards and newer Promise-returning WebKit creation are covered by unit tests; upstream alarms changes were checked in WebKit source. |
| Remaining gaps | Actual delayed alarm firing, every wrapper's successful runtime behavior and errors, all options/result fields, event payloads, popup/user-gesture UI, iOS, and optional APIs controlled by host/build flags. |

All three WebKit reports record the fixture's granted permissions, including `webRequest`.
A namespace absent from a differently configured host must not be labelled an unsupported
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

The separate **WebKit pilot** workflow runs on `macos-15` and `macos-26`, uploads the report even after failure, and
prints the actual system versions. It is not called by reusable CI or `release.yml`, so it is not a release dependency.
The hosted runs in the verification snapshot passed on both runners and uploaded their reports. These results cover
those system builds and scenarios; longer-term runner stability and other versions remain unverified.
