# Real-browser API integration tests

This directory runs the **built production package** inside disposable browser extensions. It does not install
testing globals or replace native APIs. Each API owns its scenarios; launchers, manifests and report validation are shared.

```text
tests/browser/
├── run.mjs                   # build fixtures, launch, validate reports, clean up
├── config.mjs                # CLI, suite selection, permission profiles
├── types.ts                  # suite/profile/scenario contracts
├── runners/                  # Chromium and Firefox process/installation adapters
├── extension/                # shared background entrypoint and base manifests
└── api/
    ├── index.ts              # explicit suite registry
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
through its loopback-only debugger, using `getRoot` and `installTemporaryAddon`. This follows the installation flow in
[Mozilla web-ext](https://github.com/mozilla/web-ext/blob/master/src/firefox/remote.js); the small client handles only those
requests. Debugger preferences are written only to the disposable profile, and signing requirements are unchanged.

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

## Add another API

1. Add `api/<namespace>/index.ts` exporting a `BrowserSuite` and one or more `.scenario.ts` files.
2. Declare supported browsers and separate profiles for different permission sets. Add browser-specific manifest
   options to the profile only when the API requires them.
3. Import production functions from the built `dist/index.js` in the scenarios. Use native browser APIs for observations
   and setup, and release scenario-owned tabs, windows and listeners in `finally`.
4. Register the suite in `api/index.ts`. Shared launchers should not import API-specific code.
5. Run the relevant browser(s), unit tests and `typecheck:browser`. Unsupported scenarios must be explicitly restricted
   by browser metadata, not silently skipped after a failing capability check.

The existing `tests/browser-match-patterns/` harness/native comparisons retain their separate command and CI coverage.
They now share Chromium executable validation and temporary-directory cleanup from `runners/`. Further migration of
those comparisons can happen independently; they test the published test kit rather than production Search wrappers.
