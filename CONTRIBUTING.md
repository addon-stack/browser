# Contributor Guide (@addon-core/browser)

Thank you for your interest in contributing! This package is a promise‑oriented TypeScript wrapper around the Chrome Extensions API (MV2/MV3) with additional convenience helpers. Our goal is to cover all available APIs and simplify day‑to‑day extension development.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

Contents:
- Getting started
- GitFlow: branching and PRs
- Commits: Conventional Commits and versioning
- Scope: cover Chrome APIs and add helpers
- Predicate and state contracts
- Code quality: lint, format, types
- Tests
- Documentation
- Releases and publishing (GitHub Actions + release-it)
- License

---

## Getting started

1) Fork and clone
- Repository: https://github.com/addon-stack/browser
- Clone:
  ```bash
  git clone https://github.com/addon-stack/browser.git
  cd browser
  ```

2) Install dependencies
```bash
npm ci
```

3) Useful scripts
- `npm run dev` — watch generation descriptions and build in watch mode (tsup)
- `npm run generate` — regenerate event wrappers and API availability checks
- `npm run generate:check` — check generated sources without writing files
- `npm run build` — production build (tsup)
- `npm run lint` — check code, formatting, and filenames with ESLint; does not edit files
- `npm run fix` — apply available ESLint fixes and report remaining violations
- `npm run lint:staged` — fix/check staged files and automatically stage successful fixes (also run by pre-commit)
- `npm run typecheck` — type-check package source and TypeScript tests with tsc
- `npm test` / `npm run test:ci` — tests (Jest)
- `npm run test:browser-match-patterns -- /absolute/path/to/browser` — real-browser match-pattern smoke (build first)
- `npm run test:browser -- --browser chromium --api search --binary /absolute/path/to/browser` — production API integration tests in a real extension (build first)
- `npm run typecheck:browser` — type-check browser scenarios against the built package

Minimum Node.js version: current LTS (at release time).

---

## GitFlow: branching and PRs

We use GitFlow:
- `main` — stable releases.
- `develop` — integration branch. Most PRs should target `develop`.
- Task branches:
  - `feature/<short-feature-name>` — new features.
  - `bugfix/<short-bug-name>` — fixes based off `develop`.
  - `release/<x.y.z>` — release preparation from `develop`.
  - `hotfix/<x.y.z>` — urgent fixes from `main` (merge back to `develop` after release).

PR rules:
- Small, atomic changes with a clear description and a linked issue (e.g., “Closes #123”).
- Required checks: lint, types, tests, build must be green.
- At least one review is required.

---

## Commits: Conventional Commits and versioning

Follow Conventional Commits: `type(scope): subject`.
Examples:
- `feat(tabs): add getActiveTab helper`
- `fix(downloads): handle USER_CANCELED interruption`
- `refactor(runtime): unify error handling`
- `docs(readme): add usage examples`

Types and their impact on version (as configured in release-it):
- MAJOR: any commit with `BREAKING CHANGE:` in the footer or with a bang — `feat!: ...`.
- MINOR: `feat`, and also `revert` (project policy bumps minor on reverts).
- PATCH: `fix`, `perf`, `refactor`, `ci`.
- Do not trigger a release by themselves: `docs`, `test`, `chore`, `build`, `style` (they may be hidden in the changelog).

Commit messages are validated by commitlint (see `.commitlintrc.json`). Changelog and version selection are automated via release-it + Conventional Changelog (see `.release-it.cjs`).

Format BREAKING CHANGE like this:
```
feat(action)!: rename setBadgeBgColor to setBadgeBackgroundColor

BREAKING CHANGE: function renamed to align with Chrome naming.
```

---

## Scope: cover Chrome APIs and add helpers

The goal is to cover as much of the WebExtensions/Chrome API surface as possible and provide practical helpers. For major changes, please open an issue first to discuss.

Production API modules live in `src/api/`. Namespaces use directories with `methods.ts`, `methods.test.ts`,
and a handwritten `index.ts`; native API namespaces also have generated `availability.ts` with `availability.test.ts`.
Namespaces with listeners also have event files as described below.
`browser-detection/` follows the same structure and exports its methods, enums, and interface.
`browser.ts` remains a single function with `browser.test.ts`; `env.ts` and `utils.ts` also remain flat modules.
`sidebar/` has methods and an availability check with separate Chrome, Firefox, and Opera test cases.
Its internal `api.ts` shares native API accessors between methods and availability.
Tests stay beside the corresponding implementations and import
`./methods`, `./events`, or `./availability` directly. Global native API declarations live in `src/api/api.d.ts`;
they are not re-exported from the API index. `src/types.ts`, `src/internal/`, and `src/testing/` remain outside `api/`.
`src/api/index.ts` explicitly re-exports the public API modules. The root `src/index.ts` re-exports `./api`.
The build copies `src/api/api.d.ts` to `dist/api.d.ts`, preserving the published declaration references.
Keep the API export list in `src/api/index.ts`; `utils.ts` remains available through the separate `/utils` entrypoint.
Published entrypoints, including the separate `/utils` and `/testing` exports, remain unchanged.

In `src/api/action/`, handwritten `methods.ts` and generated `events.ts` share the internal `api.ts`
selector for MV3 `action` and MV2 `browserAction`. Generated `availability.ts` uses the same selector.
Its index exports methods, events, and availability; the selector remains internal.
Manifest selection remains in that handwritten selector and runs when each wrapper is called.

How to add a new API wrapper:
1) Implementation
- Create `src/api/<api-in-kebab-case>/` with `methods.ts`, `methods.test.ts`, and a handwritten `index.ts` that re-exports the methods. Register the native namespace in `codegen/availability/apis.mjs` and re-export its generated availability check. Add event files when the API has listeners, following the generation rules below.
- Wrap callback‑style APIs into `Promise` and call `checkLastError()` inside callbacks.
- Events must return an unsubscribe function `() => void` (see `handleListener`/`safeListener`).
- Use precise types from `@types/chrome` (avoid `Parameters<>` in the final documentation — show real argument types).
- Keep function names concise and consistent (see existing modules).
- Where appropriate, add cross‑MV2/MV3 helpers and cross‑browser unification (examples: `action`, `sidebar`).

2) Export
- Re-export from `src/api/index.ts`; the root `src/index.ts` forwards the API exports.

3) Documentation
- Create `docs/<api-in-kebab-case>.md` following the template: “Documentation → Methods/Events (links to sections) → sections with real TypeScript signatures”.
- Update the list in `README.md` (link to the new file and add a brief description where it helps).

4) Tests
- Cover core scenarios: success, error (`runtime.lastError`), events (subscribe/unsubscribe behavior).

See the list of not-yet-covered APIs in the "Not yet covered" section of `README.md`.

### Generated events

Event descriptions live in `codegen/events/apis/`:

- Basic subscriptions: `alarms`, `audio`, `commands`, `context-menus`, `cookies`, `downloads`, `history`, `identity`, `idle`, `management`,
  `notifications`, `permissions`, `runtime`, `tab-capture`, and `tabs`.
- Specialized or mixed subscriptions: `action`, `web-request`, `windows`, and `web-navigation`.

Each namespace has its own `.mjs` description. `codegen/events/apis/index.mjs` explicitly imports these
descriptions and exports their combined list.
Edit these descriptions, then run `npm run generate`; do not edit their `src/api/<namespace>/events.ts` files directly.
Keep descriptions and generated
sources in version control. Each namespace's `index.ts` is maintained manually and re-exports `./events`
and `./methods`. Native API wrappers and custom methods remain together in `methods.ts`.
Source imports of these namespaces resolve to the directories' indexes.
The public `WindowEventFilter` interface is maintained in `src/api/windows/types.ts` and re-exported by its index.
Keep event tests in `events.test.ts` and method tests in `methods.test.ts` beside the corresponding source files.

API-specific listener wrappers live in a handwritten `custom-events.ts` with their own `custom-events.test.ts`.
For example, `commands/events.ts` generates `onCommand`, while `commands/custom-events.ts` implements
`onSpecificCommand` by importing `onCommand` directly from `./events`. Alarms follow the same structure:
generated `onAlarm` and handwritten `onSpecificAlarm`. The namespace index re-exports both
event files and `./methods`. A custom listener returns the base subscription's unsubscribe function and the
callback result, so `safeListener` can observe rejected Promises. Event generation owns only `events.ts` and must
not rewrite custom listeners. Namespaces without custom listeners do not need these extra files.

`codegen/events/generate.mjs` selects a template for each event and combines the functions and their imports
into one module per namespace. A description's `template` selects the default (`basic` when omitted).
An event may be a native event name, or an object such as
`{event: "onActionIgnored", template: "basic"}` to override that default for one event.
Unknown templates and invalid descriptions fail generation before any files are written.

Templates live in `codegen/events/templates/`:

- `basic.mjs` accepts only a callback and delegates subscription and cleanup to `handleListener`.
  Notifications use this template without an availability guard. `isAvailableNotifications()` remains
  a separate generated function for callers that need an explicit namespace check.
  Runtime message events also use it: `sendResponse` is a callback argument, not a registration option.
  Their wrappers preserve callback return values, including `true` and Promises, through `safeListener`.
  Downloads use the same template: `suggest` is a callback argument of `onDownloadsDeterminingFilename`;
  its listener return value (including `true` for a deferred suggestion) is preserved.
- `action.mjs` accepts a callback typed from the native `chrome.action` event and subscribes through
  the shared `action()` selector and `handleListener`. It preserves the existing behavior when an event
  is unavailable on the selected API; it does not fall back to another namespace or silently skip it.
- `web-request.mjs` accepts a callback, required filter, and optional `extraInfoSpec`. All three types
  come from that specific native event's `addListener`. It uses `safeListener` to preserve callback
  results and contain errors, and retains the subscribed event object for cleanup.
- `windows.mjs` accepts a callback and optional `WindowEventFilter`. It omits the second registration
  argument when no filter is supplied, preserving the existing calling convention.
- `web-navigation.mjs` accepts a callback and optional native filter. It forwards the filter as the
  second registration argument, including `undefined` when omitted. Both filtered templates use
  `safeListener` and retain the subscribed event for cleanup. `onWindowBoundsChanged` and
  `onWebNavigationTabReplaced` override their namespace defaults with `basic`.

Templates can declare additional imports, such as the handwritten `WindowEventFilter` type; the generator
deduplicates these imports alongside the required utilities. Templates using `browser()` declare
`usesBrowser: true`; templates using their own accessor do not receive an unused browser import.

Browser API access happens when a wrapper is called, not during import. Descriptions and generation
scripts are not part of the published runtime. Events with other registration behavior need a matching
template under `codegen/events/templates/`, registered in `codegen/events/generate.mjs`.

`codegen/generate.mjs` is the common CLI and programmatic entrypoint. It imports the default functions from
`codegen/events/index.mjs` and `codegen/availability/index.mjs` and calls them without arguments. Each section
index connects its own API descriptions to the algorithm in its local `generate.mjs`. Importing or calling a
section entrypoint does not write files. Calling its default function returns module descriptions with `namespace`, `name`,
`exports`, and `source`. The entrypoint checks output-path and export-name conflicts, then writes or checks
`src/api/<namespace>/events.ts` and `src/api/<namespace>/availability.ts`. Namespace indexes and methods are maintained
manually; generation owns those two generated files and does not create indexes or select public exports by scanning directories.

The section algorithms still accept descriptions as an argument for focused tests; callers that need the full
configured generation use each section's default export. Keep relative ESM imports explicit, including the
`.mjs` extension and `/index.mjs` for directory entrypoints: these scripts run directly in Node.js.

```text
codegen/
├── generate.mjs
├── events/
│   ├── index.mjs          # configured default-export generator
│   ├── generate.mjs       # algorithm accepting descriptions
│   ├── apis/             # per-namespace descriptions and their index.mjs list
│   └── templates/
└── availability/
    ├── index.mjs          # configured default-export generator
    ├── generate.mjs       # algorithm accepting descriptions
    ├── apis.mjs           # namespace descriptions
    └── templates/
```

`npm run build` generates sources before tsup and checks a separate consumer for each generated namespace,
importing one event from the built ESM entrypoint: unused event wrappers and methods must disappear.
Both action events have their own consumers, which must retain both manifest branches.
Commands and alarms also have separate consumers for their base and filtered listeners. Each filtered
consumer must retain its name check and base subscription; the base consumer must not retain the custom wrapper.
Runtime has separate consumers for all three message events to verify callback forwarding and return values.
`npm run dev` starts the generator under Node's watch mode alongside tsup;
`npm run generate:watch` watches descriptions and templates without starting tsup.
CI runs `npm run generate:check` before any build so generation cannot hide a stale checked-in file.
When adding another event namespace, add its description under `codegen/events/apis/`, register it in
`codegen/events/apis/index.mjs`, and explicitly re-export `./events` from the appropriate public source module.

### Generated availability checks

`codegen/availability/apis.mjs` explicitly lists all 29 native API modules, including modules without events.
Descriptions contain `namespace` and an optional `template` (`basic` by default). Export names are derived as
`isAvailable` plus the namespace with its first letter capitalized; the rest of its camelCase is preserved.
For example, `userScripts` produces `isAvailableUserScripts`. There is no `exportName` override.
Utility modules (`browser`, `browser-detection`, `env`, and `utils`) are not native API namespaces.

`codegen/availability/generate.mjs` renders one `availability.ts` per description. Its templates live in
`codegen/availability/templates/`: `basic` checks `browser().<namespace>`, `action` uses the shared MV2/MV3
selector, and `sidebar` uses the shared Side Panel/Sidebar Action accessors. Unknown fields, invalid namespaces,
and unknown or mismatched specialized templates fail before any output is written. The common generation
entrypoint also rejects duplicate output paths or export names across generators.

Every check is a synchronous `() => boolean`: it returns false when the API is absent or API access throws,
without logging, probing native methods, or caching the result. A true result means namespace presence only;
it does not promise permission, individual method support, or successful operations. Action reads the manifest
through its existing selector. In particular, `isAvailableUserScripts` does not probe `getScripts()` to detect
revoked access; `canOpenSidebar` and `canCloseSidebar` remain separate method-level checks.

Add `export * from "./availability"` to the handwritten namespace index. Remove any duplicate handwritten
availability export from `methods.ts`; the existing Notifications, Scripting, and User Scripts export names
remain unchanged. These checks now return false, rather than throwing, when WebExtension globals are absent.
Document each function in `docs/<api>.md` and classify every new public export in the testing coverage matrix.

Keep tests in each module's `availability.test.ts`, importing the generated implementation directly. Common
namespace cases live in `tests/api/availability.ts`; Action and Sidebar have dedicated branch tests. The
`generate:check` and codegen CLI tests cover both output kinds. Build verification bundles one availability
consumer per namespace, checks removal of unused wrappers, and executes it without extension globals to
verify lazy access. Clean-package tests verify synchronous types and ESM/CJS exports.

---

## Predicate and state contracts

Native method proxies preserve native results and errors, including boolean methods such as
`hasOffscreen()`, `containsPermissions()`, and `getAudioMute()`. A boolean return type does not imply
that a native proxy suppresses errors. Keep `callWithPromise()` strict.

Custom safe predicates return `boolean` (or `Promise<boolean>`), with `true` only for a confirmed match
and `false` when the condition cannot be confirmed. They contain lookup errors without logging or caching.
When callers need to distinguish a negative result from an unknown state, expose an explicit state query,
such as `getSidebarState(): Promise<SidebarState>`, instead of adding `undefined` to an `is`/`has` result.

Operations must use strict lookups when errors matter: Action selection uses `getManifestVersion()`,
and `showDownload()` uses `findDownload()`. Do not use a safe predicate to silently suppress operation failures.
Test native error propagation and safe-predicate fallbacks separately, including public consumer types.

## Code quality: lint, format, types

- Formatting/linting: [ESLint](https://eslint.org/) with TypeScript support and
  [ESLint Stylistic](https://eslint.style/). The single configuration is `eslint.config.js`.
- `npm run fix` applies available fixes; `npm run lint` only checks and fails on errors or warnings.
- Type checking: `npm run typecheck`.
- Husky pre-commit runs `npm run lint:staged`, then `npm run test:related`.
  `lint-staged` applies ESLint fixes to staged files and stages those fixes automatically. It temporarily hides
  unstaged edits in partially staged files, then restores them without adding them to the commit.
  Non-fixable lint errors (including filename errors) stop the commit; lint-staged restores the pre-lint state
  on task failure. If tests fail after lint-staged succeeds, the formatting fixes remain staged for review.
- Pre-commit checks formatting only for staged files, so unrelated unstaged formatting does not block a commit.
  Tests still run against the working tree. Use `npm run lint` for a full-project check.
- Husky pre-push runs lint, typecheck, full tests, and build. Regenerate event sources before staging them;
  the build can update stale generated files.

Formatting rules:

- Four-space indentation, double quotes (except when escaping would be needed), semicolons, LF line endings,
  no spaces inside object/import braces, and optional parentheses around a single untyped arrow parameter.
- Trailing commas in multiline arrays, objects, imports, exports, enums, tuples, and type parameters, but not function arguments.
- One blank line before `return` and before/after `if`, `for`, `while`, `do`, and `switch` statements.
  No extra padding at block boundaries or between `if` and `else`. Consecutive single-line variable declarations stay together.
- One blank line before and after any statement or declaration spanning two or more lines, including variable
  declarations, calls, assignments, functions, classes, and TypeScript types (`project/padding-around-multiline`).
  Only neighboring statements are separated: no padding at file/block boundaries, between arguments, or between
  object/type/class members. Import and re-export groups retain their existing sorting/grouping rules.
- At most one consecutive blank line; no trailing whitespace. Imports are sorted and separated from following code.
- Recommended JavaScript/TypeScript correctness checks. Explicit `any` is allowed; unused parameters, catch bindings,
  and variables prefixed with `_` are allowed. Other unused bindings are reported, not silently deleted.
- JSON/JSONC: two-space indentation and expanded nonempty objects/arrays. JSON remains strict; JSONC permits comments.
- The former 120-column width is a readability guideline, not a failing `max-len` rule: ESLint does not automatically
  wrap arbitrary long expressions like a dedicated formatter.

Filename rules (`project/file-naming`):

- A module defining and exporting a regular class must use the exact class name in PascalCase: `BrowserClient.ts`.
  A module defining multiple exported classes must split them into separate matching files. Re-export barrels may
  keep names such as `index.ts`.
- Exception classes extending `Error` (including native error subclasses and local inheritance chains) stay in their
  owning module and do not determine its filename. For example, `SidebarError` stays in `src/api/sidebar/methods.ts`.
- Other files use kebab-case, including documentation: `custom-events.ts`, `browser-detection.md`.
- Tests use the subject's casing: `BrowserClient.test.ts` or `custom-events.test.ts`.
  Dot-separated suffixes such as `.integration.test`, `.spec`, `.config`, and `.d` stay lowercase.
- Standard project metadata names (`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  `LICENSE`, `LICENSE.md`, and `AGENTS.md`) are exempt. Names such as `package.json` and `tsconfig.json` already comply.
- The local naming rule also checks non-code filenames; it does not format Markdown/YAML or rename files.
  Renames require updating imports and links. Generated output, dependencies, coverage, the lockfile, and local
  environment/editor files are excluded.

The configuration regression tests in `tests/tooling/` run with the regular Jest suite. Hook tests use temporary
Git clones to verify staging, partial staging, and rollback without modifying the current checkout's Git state.

PRs with lint/type/build errors won’t be accepted.

---

## Tests

Framework: **Jest** (`npm test`). Recommendations:
- Mock `chrome.*` APIs (simple stubs/mocks are fine).
- Test error paths (`runtime.lastError`).
- For events, verify that the returned function actually removes the listener.
- Test-kit checks belong in `tests/testing/unit/` and `tests/testing/integration/`, not in `src/testing/`.
  Production-wrapper and utility tests are colocated in `src/api/`.
- Colocated tests import the implementation directly: `methods.test.ts` imports `./methods`,
  `events.test.ts` imports `./events`, `custom-events.test.ts` imports `./custom-events`,
  `availability.test.ts` imports `./availability`, and type imports
  use their defining module.
  Public entrypoint exports are checked separately by build verification and package-consumer tests.

In CI use `npm run test:ci`. All test scripts (`npm test`, `npm run test:ci`, and `npm run test:related`) share the same Jest ESM launcher, including Node's `--experimental-vm-modules` flag. No manual `NODE_OPTIONS` setup is needed locally or in CI.

Import Jest helpers explicitly in test files, for example `import {describe, expect, jest, test} from "@jest/globals"`. In ESM, the `jest` object is not a global. These imports belong only in test suites; the published `@addon-core/browser/testing` runtime remains runner-independent.

### Browser API integration tests

Production API integration tests live in [`tests/browser/`](tests/browser/README.md). The common runner, browser
launchers and extension shell are shared; `api/<namespace>/` declares browser support, permission profiles and
`.scenario.ts` files. These scenarios import the built production package and run inside real disposable extensions.
They are separate from Jest and from the in-memory test-kit integration tests below. The regular Jest suite still
checks browser-runner infrastructure through its `.test.mjs` files. Add new API scenarios to `tests/browser/api/index.ts`.

### Test-kit layout and dependency boundaries

`src/testing/` contains the shipped implementation, not its test suites:

```text
src/testing/
├── index.ts              # stable public entrypoint
├── harness.ts            # assembly and lifecycle coordination
├── fixtures.ts           # deterministic data factories
├── types.ts              # public browser facade types
├── primitives/           # methods, events, lastError, calls and cloning
├── environment/          # descriptors, browser profiles and console capture
├── model/                # tabs/windows state, contexts, documents and lifetimes
├── api/                  # WebExtension API implementations and configurable controls
├── matching/             # shared URL-pattern matching
├── node/                 # separate testing/node entrypoint; never re-exported by the portable root
└── coverage/             # public-export and raw-capability metadata, not coverage reports

tests/
├── testing/
│   ├── unit/             # component tests grouped by the corresponding source responsibility
│   └── integration/      # combined components, real wrappers and jsdom (no real browser)
├── api/                  # shared test cases for colocated production API tests
├── consumer-types/       # fresh tarball: TypeScript, ESM, CJS and jsdom
├── browser/              # production API integration tests in Chromium and Firefox
├── browser-match-patterns/ # real-browser comparisons with a temporary Chromium profile
└── tooling/              # lint/hooks, layout and dependency-boundary guards
```

Primitives do not depend on API implementations or harness assembly. The shared model may use primitives and
fixtures, but must not import runtime, Offscreen or scripting implementations. API implementations reuse the model;
`harness.ts` connects the components. Each implementation directory has an `index.ts` that explicitly selects only
its public functions and types. Cross-directory imports of public members use that local entrypoint, for example
`../primitives`. Internal helpers such as `createContextRegistry` or `createRuntimeHarness` are imported directly
from their implementation files and are not re-exported by directory indexes. The internal-only `matching/index.ts`
has no public exports. Files within one directory import sibling files directly, never their own barrel, to avoid
circular dependencies. Unit tests may import internal implementation files; integration tests use the public testing
entrypoint to verify the consumer-facing API. Test directories do not need barrel files: Jest discovers the suites.

The root `src/testing/index.ts` combines the public module entrypoints with `export *`. The export selection belongs
to each directory, not to the root barrel. Internal source modules never import the root public barrel. Directory
exports, import boundaries and runtime cycles are checked by `tests/tooling/testing-layout.test.mjs`. Its explicit
`tests/tooling/fixtures/testing-public-exports.json` baseline also guards the package's value and type export names;
update it only for an intentional public API change, never just to accommodate a refactor.

`node/index.ts` is the deliberate exception to root re-exports: it owns `@addon-core/browser/testing/node` and has a
separate `testing-node-exports.json` baseline. The recursive source-graph guard also follows type imports, re-exports,
dynamic imports and require calls. No dependency reachable from `src/testing/index.ts` may import a `node:` or bare
Node builtin; computed module specifiers fail closed. Build and clean-consumer checks cover all three entrypoints.

`npm run typecheck` runs both `tsconfig.json` and `tsconfig.tests.json`. Jest uses the latter for TypeScript tests;
the build keeps the source config. Clean-consumer fixtures retain their separate config and installed-package
resolution. The layout test ensures every TS file in `tests/testing/` remains covered by test typechecking.

```sh
npm test -- --runInBand tests/testing
npm run typecheck
```

Keep generated coverage reports in the root `coverage/`. Do not ignore all directories named `coverage`: the source
matrices and their tests must remain tracked and linted. These internal folders do not introduce npm subpath exports;
consumers continue to import only `@addon-core/browser/testing`.

### Browser match-pattern smoke

Before releasing changes to the URL matcher, host-permission fake, runtime context registry, Storage, Offscreen, scripting targets or contextual messaging model, run the real-browser
smoke in addition to unit and clean-consumer tests. Obtain the full **Chrome for Testing** executable from the
[official downloads](https://googlechromelabs.github.io/chrome-for-testing/) or use a Chromium build with extension
support. No ChromeDriver, Playwright, or other automation package is needed. Do not use `chrome-headless-shell`.

```sh
npm run build
npm run test:browser-match-patterns -- "/absolute/path/to/chrome-for-testing"
```

On macOS, pass the executable inside the app bundle, for example
`/path/to/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, not the `.app` directory.
The script verifies `--version` before starting. Regular Google Chrome is intentionally rejected:
[Chrome 137+ removed `--load-extension` from branded builds](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/1-g8EFx2BBY/m/S0ET5wPjCAAJ).
A remaining timeout includes the selected binary/version, missing extension results, a setup hint, and bounded stderr.

The smoke compares the built harness with real MV3 extension APIs, using a temporary browser profile and loopback
HTTP server. It never uses your personal profile. It is separate from `npm test` so local unit tests need no browser.
Besides URL queries and permissions, it compares `runtime.getContexts()` visibility and filtering for a background
worker and extension tab, and checks that a real injected content script is excluded from that API. It also compares
Offscreen create/close, duplicate/absent-operation errors and native context fields via callbacks and Promises. The
version-dependent `hasDocument` method is feature-detected and an unavailable method is reported as not compared.
It also compares contextual runtime/tab messages between worker, Offscreen, main content frame and iframe, including
frame/document addressing, sender metadata, JSON payloads and held-channel closure through callback/Promise method
calls. Extension-tab delivery uses a readiness handshake. The context snapshot must contain exactly one `TAB` context
matching that page's tab, frame, document ID and exact URL; missing or ambiguous matches report the full snapshot
without falling back to the first context in the tab. Promise-listener success/rejection, empty responses and
unanswered messages are measured separately; the detected `accept`/`ignore` behavior is printed and compared with the
fake in that mode. Unknown outcomes fail the smoke. Both modes are independently covered by unit tests; this probe
does not establish rollout availability for all users or isolated application execution. It also compares Storage selectors,
serialization (including Date/RegExp/undefined), change payloads/no-op suppression and UTF-8 byte accounting.
Scripting comparisons cover main/all/frame/document selectors, duplicate frame IDs, result identifiers/order and
invalid targets via callbacks and Promises using a metadata-only fake executor. Separate comparisons actually execute
the same source through `testing/node` and Chrome for child throws/rejections, body/cycle/BigInt, void/undefined and
Date/RegExp (including own fields and Invalid Date) results. Node's body
is an explicit data fixture, not a DOM implementation. These are not claims that the general configurable executor
has Chrome's failure/serialization behavior. See [scripting boundaries](docs/testing/scripting.md) and [Node scope](docs/testing/node.md).
The [persistent Node runtime](docs/testing/node-runtime.md) is compared separately for successive-injection state and
frame/world isolation through both invocation styles. Its bootstrap/microtask tests run without host timer mocks;
optional public document binding follows removal/reset without internal reset hooks. Clean ESM/CJS consumers verify
the factory from the packed `testing/node` entrypoint, including deferred replies, lifetime reuse and disposal.
For changes affecting persistent application managers, optionally run
`npm run test:relay-consumer -- /path/to/addon-bone` with that checkout's development dependencies installed. This
read-only check bundles the real Relay manager/adapter; it does not migrate or modify the consumer's tests. It is not
part of standalone CI. [Guest clocks](docs/testing/node-clock.md) have independent inline retry acceptance at
2699/2700 ms; the optional Relay check additionally tracks the consumer's missing-manager bug (#109). The native
smoke compares a zero-delay timer/microtask ordering sequence with the guest runtime, not wall-clock timing parity.
See [runtime modes](docs/testing/node-runtime.md).
The clean-consumer check additionally installs published `@addon-core/storage@0.7.0` and exercises its unmodified
providers through ESM/CJS kit imports and jsdom. See [Storage scope and consumer examples](docs/testing/storage.md).
If the browser is unavailable locally, report the smoke as **not run**, not as passed.

`.github/workflows/ci.yml` runs this command in one dedicated Ubuntu 22.04/Node 22 job using stable Chrome for Testing
provided by `browser-actions/setup-chrome` (action revision pinned). The installed version is printed in the log.
This runner keeps Chromium's sandbox enabled without working around the
[AppArmor restrictions on downloaded binaries in Ubuntu 23.10+](https://pptr.dev/troubleshooting#issues-with-apparmor-on-ubuntu).
The release workflow calls the same CI workflow and cannot publish if this job fails. This focused Chrome check is
not Firefox/Safari validation or complete browser parity. See [scope and examples](docs/testing/match-patterns.md).

---

## Documentation

- For each new API, add a file under `docs/` and keep signatures accurate.
- Keep README concise and link to detailed per‑API docs in `docs/`.
- Maintain a consistent style and anchors for methods/events.

---

## Releases and publishing (GitHub Actions + release-it)

Releases are performed by maintainers.

The reusable CI workflow includes [production API integration tests](tests/browser/README.md) in Chromium and Firefox
and the [browser match-pattern smoke](#browser-match-pattern-smoke). Keep these green alongside unit, type, build,
and consumer checks before publishing; no separate manual browser-test waiver is implied.

Flow (aligned with GitFlow):
1) Merge features into `develop` via PRs.
2) Create a `release/x.y.z` branch from `develop`. Preview autogenerated CHANGELOG:
   ```bash
   npm run release:preview
   ```
3) Prepare the release:
   ```bash
   npm run release
   ```
   This runs release-it: determines the version via Conventional Commits, creates tag `vX.Y.Z`, generates `CHANGELOG.md`, and pushes tags.
4) Pushing a `v*` tag triggers GitHub Actions, which:
   - runs lint/types/tests/build;
   - creates a GitHub Release;
   - publishes the package to npm (`npm publish`).

Required repository/org secrets:
- `NPM_TOKEN` — for publishing to npm;
- `GITHUB_TOKEN` (provided automatically by Actions) — for releases and changelog.

Release configuration: `.release-it.cjs` (preset `conventionalcommits`, changelog generation, version bump rules). Scripts: `npm run release`, `npm run release:preview`.

---

## License

By contributing, you agree to license your contributions under the project’s MIT license. See `LICENSE.md`.
