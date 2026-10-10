# Real-browser API integration tests

This directory runs the **built production package** inside disposable browser extensions. It does not install
testing globals or replace native APIs. Each API owns its scenarios; launchers, manifests and report validation are shared.

```text
tests/browser/
├── run.mjs                   # build fixtures, launch, validate reports, clean up
├── config.mjs                # CLI, suite selection, permission profiles
├── auth-fixture.mjs          # local authorization redirects and interactive page
├── types.ts                  # suite/profile/scenario contracts
├── runners/                  # Chromium and Firefox process/installation adapters
├── extension/                # shared background entrypoint and base manifests
└── api/
    ├── index.ts              # explicit suite registry
    ├── bookmarks/            # node lifecycle, native events, missing permission
    ├── declarative-net-request/ # static/dynamic/session rules, real network effects, debug event
    ├── identity/             # native auth redirects, interactive windows, errors, permissions
    ├── tab-groups/           # group lifecycle, native events, ungrouping, missing permission
    ├── top-sites/            # basic retrieval, Firefox options, missing permission
    └── search/
        ├── index.ts          # browsers, permission profiles, scenarios
        ├── query.scenario.ts
        ├── engines.scenario.ts
        ├── permissions.scenario.ts
        └── navigation.ts
```

## Run

Use Node.js 22 or 24 and build first:

```bash
npm run build
npm run test:browser -- --browser chromium --api search --binary "/absolute/path/to/chrome-for-testing"
npm run test:browser -- --browser firefox --api search --binary "/absolute/path/to/firefox"
```

`CHROME_FOR_TESTING_PATH` and `FIREFOX_PATH` can supply the executable paths instead. Use the full **Chrome for Testing
or Chromium** binary; regular Chrome 137+ and chrome-headless-shell do not support this extension-loading setup.
Firefox must support MV3 and the declared manifest minimum (currently 140+). No signed addon, default profile,
browser account, or additional npm dependency is required. Browsers are supplied explicitly, not downloaded by the runner.

Omit `--api` to run all registered suites supporting the selected browser:

```bash
npm run test:browser -- --browser chromium
npm run test:browser -- --browser firefox --list
npm run typecheck:browser
```

`--list` requires a build, but does not launch a browser. The runner also type-checks scenario TypeScript before execution.
`.scenario.ts` files are not discovered by Jest. The `.test.mjs` tests beside the runner exercise configuration, report
validation, process cleanup and Firefox protocol handling; they run in the regular `npm test` suite without launching browsers.

## Isolation and result handling

Each suite/profile pair gets a new extension build, browser profile and loopback report server. Profile permissions are
copied exactly, so the denied Search profile never inherits `search` from the positive profile. A per-run random report
token and exact scenario list prevent empty, duplicate, missing, failed, or skipped results from being reported as success.
Browser startup/installation errors and a 60-second scenario timeout fail the command with browser version and diagnostics.
Processes, sockets and temporary directories are cleaned up on completion, failure and handled interruption.

Chromium loads an unpacked MV3 service worker. Firefox loads an MV3 background script and installs the temporary addon
through its loopback-only debugger. Installation uses the `getRoot` / `installTemporaryAddon` flow from
[Mozilla web-ext](https://github.com/mozilla/web-ext/blob/master/src/firefox/remote.js). Before installing the extension,
the client uses the parent-process console to check Firefox's `places-browser-init-complete` notification, including
the already-initialized case. This prevents first-run bookmark import from overwriting scenario data. The readiness
check has a ten-second deadline; it does not replace native APIs or change bookmark permissions. Debugger preferences
are written only to the disposable profile, and signing requirements are unchanged.

## Search coverage

- **Both browsers:** default query destination, explicit inactive tab, all four destination helpers, actual search
  navigation, exact tab/window counts, method capabilities, and calls without the `search` permission.
- **Firefox:** native engine list, default engine, engine-name predicate, explicit engine selection in an existing/new
  tab, and rejection for an unknown engine. The fixture installs a non-default engine with a reserved `.test` URL so
  navigation proves that the selected engine was used.

The tests observe `webNavigation.onBeforeNavigate` and native tab/window state. They do not wait for or scrape a search
results page. Default-provider scenarios use synthetic query text (including Unicode and URL-sensitive characters);
the browser may send that text to its default search provider. No personal browser profile is used. The engine-selection
fixture navigates to `https://search.browser.test/`; that address is intentionally not a live search service.

## Top Sites coverage

The `top-sites` suite runs with only `topSites` permission and in a separate profile without it.
Both browsers exercise the basic call; Chromium must reject the Firefox options overload. Firefox
also checks option calls, result limits, extra entry fields and native argument validation.
Clean profiles may return an empty list. The tests do not assert specific websites or ranking,
and do not require `history` permission. Select this suite with `--api top-sites`.

```bash
npm run build
npm run test:browser -- --browser chromium --api top-sites --binary /path/to/chrome-for-testing
npm run test:browser -- --browser firefox --api top-sites --binary /path/to/firefox
```

The shared CI commands include this suite. These runners cover Chromium and Firefox;
they do not launch Edge, Opera or Safari.

## Bookmarks coverage

The `bookmarks` suite runs three scenarios across two permission profiles:

- **Lifecycle:** all eleven wrappers, string and array IDs, tree/subtree/children, recent items,
  string and object search, creation, update, move and both deletion methods. Native reads verify changes;
  nonempty-folder deletion and deleted-ID lookup must reject. Firefox creates a separator and retains its
  `type`; Chromium must reject that Firefox-only option.
- **Events:** native operations deliver created/changed/moved/removed payloads to production subscriptions;
  unsubscription stops delivery. Chromium-only sorting/import event availability is checked, but those
  UI-driven events are not triggered by the runner (their wrapper contracts have unit coverage).
- **Permissions:** the separate profile without `bookmarks` must report unavailable and reject tree access.

Each positive scenario creates its own temporary folder and removes it in `finally`. No existing bookmarks
are edited and no bookmark URL is navigated. Use `--api bookmarks` to run only this suite. The shared CI
commands run it automatically in Chromium and Firefox; Edge, Opera and Safari are not launched.

## Declarative Net Request coverage

Select `--api declarative-net-request`. Three scenarios run in independent permission profiles:

- **Rules and network:** dynamic/session read and update, ID filters, atomic failure rollback,
  static ruleset and individual rule toggling, available static count, and regex support. An ordinary
  page sends HTTP requests to a loopback fixture. The server records received requests and echoes
  headers, verifying real blocking, redirect destinations, request/response header changes and restoration.
- **Feedback:** hypothetical matching in Chromium and Firefox; Firefox's additional options and feedback
  preference. Chromium also triggers the real debug event, validates its request/rule metadata, checks
  matched-rule history, changes badge-count options, and confirms independent unsubscription. Firefox's
  unsupported feedback members must fail rather than simulate success.
- **Permissions:** without DNR permission, availability is false and operations/subscriptions fail.

Static JSON rules are declared in the profile's `resources` under `fixtures/`. `firefoxPreferences`
sets `extensions.dnr.feedback` only in each disposable profile; the normal profile also proves that
hypothetical matching fails when that preference is disabled. Firefox loopback host permission patterns
omit the port because Firefox does not support ports in match patterns. No DNR scenario contacts an
external website. The suite is included automatically in the existing Chromium and Firefox CI jobs.
Safari, Edge and Opera are not launched; Safari's different history result has unit and type coverage.

## Tab Groups coverage

Select `--api tab-groups`. Three scenarios run across two permission profiles in Chromium and Firefox:

- **Lifecycle:** group existing tabs, get and query groups, change title/color/collapsed state, move within
  a window and between windows, ungroup, and reject operations on missing groups. Native reads verify
  membership, destination index and persisted state. Ungrouping also checks the existing Tabs wrapper
  against Firefox's Promise-only native method and Chromium's callback support. Chromium's shared filter and Firefox's absent shared
  result field are checked separately.
- **Events:** all four subscriptions, Chromium's removed/created events for transfers versus Firefox's
  moved event, Firefox removal information for both ordinary removal and window closure, and cleanup.
  Native event observers confirm that each production subscription stops receiving events after unsubscribe.
- **Permissions:** without `tabGroups`, availability is false and all four methods and subscriptions fail.

Positive profiles grant only `tabGroups`. Scenarios create their own windows with `about:blank` tabs and
close them in `finally`; they do not touch personal profiles or navigate external sites. The common CI
commands include the suite automatically. Edge, Opera and Safari are not launched by these runners.

## Identity coverage

Select `--api identity`. The suite runs six scenarios in Chromium and five in Firefox, across profiles
with and without the `identity` permission. It exercises the built `launchWebAuthFlow()` wrapper and
Chromium's `getAuthToken()` failure paths against the real browser API:

- **Redirects:** immediate HTTP redirects with `interactive` omitted, `false`, and `true`; exact preservation
  of query parameters and fragments; and provider error redirects returned unchanged to the caller.
- **Errors:** a login page that needs interaction and an HTTP error response must reject a silent flow.
  Server request counters prove these failures occur after contacting the authorization endpoint.
- **Interactive flow:** a real native auth window loads the local page and executes its script. The fixture
  releases a redirect after approval; a separate run closes the window through `windows.remove()` and verifies
  rejection. Both paths verify window cleanup. These are headless browser checks, not manual login/UI tests.
- **Permissions:** without `identity`, availability is false and the methods fail before reaching the provider.
- **Firefox:** the supported `http://127.0.0.1/mozoauth2/<extension-hash>` redirect completes successfully;
  an arbitrary redirect URI is rejected before contacting the provider. `redirect_uri` is supplied as a query
  parameter of the authorization URL, not as an extra field in native `details`.
- **Chromium token failures:** `getAuthToken()` rejects in the profile without `identity`. With `identity`
  but no `oauth2` manifest configuration, its rejection retains the message captured from the native
  callback's `runtime.lastError`. Both scenarios check omitted options and `interactive: false`, and
  require a rejected Promise rather than a synchronous throw. No account or OAuth client is configured.

The provider is a loopback HTTP fixture with synthetic codes and tokens. It needs no OAuth client registration,
credentials, signed-in browser profile or external authorization server. It does not validate Google/GitHub login,
provider configuration, token exchange, PKCE or application-level state validation. The native Identity API is not
mocked. CI includes this suite automatically in its existing Chromium and Firefox jobs; Edge, Opera and Safari
are not launched.

The `getAuthToken()` scenarios do not test successful Google token issuance, its consent screen, or token caching.

```bash
npm run build
npm run test:browser -- --browser chromium --api identity --binary /path/to/chrome-for-testing
npm run test:browser -- --browser firefox --api identity --binary /path/to/firefox
```

## Add another API

1. Add `api/<namespace>/index.ts` exporting a `BrowserSuite` and one or more `.scenario.ts` files.
2. Declare supported browsers and separate profiles for different permission sets. Add browser-specific manifest
   options to the profile only when the API requires them. Use `resources` for manifest JSON fixtures
   and `firefoxPreferences` for explicit preferences in the disposable Firefox profile.
3. Import production functions from the built `dist/index.js` in the scenarios. Use native browser APIs for observations
   and setup, and release scenario-owned tabs, windows and listeners in `finally`.
4. Register the suite in `api/index.ts`. Shared launchers should not import API-specific code.
5. Run the relevant browser(s), unit tests and `typecheck:browser`. Unsupported scenarios must be explicitly restricted
   by browser metadata, not silently skipped after a failing capability check.

The existing `tests/browser-match-patterns/` harness/native comparisons retain their separate command and CI coverage.
They now share Chromium executable validation and temporary-directory cleanup from `runners/`. Further migration of
those comparisons can happen independently; they test the published test kit rather than production Search wrappers.
