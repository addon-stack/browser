# @addon-core/browser

**Browser extension APIs, made easier.**

Write cleaner extension code with typed helpers, promise-based calls, and event listeners that are easy to manage. Spend less time on repetitive browser API plumbing and more time building your extension.

Built for Chrome and Chromium-based browsers, with MV2/MV3 compatibility helpers and selected Firefox support.

[![npm version](https://img.shields.io/npm/v/%40addon-core%2Fbrowser.svg?logo=npm&style=for-the-badge)](https://www.npmjs.com/package/@addon-core/browser)
[![npm downloads](https://img.shields.io/npm/dm/%40addon-core%2Fbrowser.svg?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@addon-core/browser)
[![CI](https://img.shields.io/github/actions/workflow/status/addon-stack/browser/ci.yml?style=for-the-badge)](https://github.com/addon-stack/browser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE.md)

## Why this package

- **Less boilerplate, clearer intent.** Concise, consistent helpers like `getActiveTab()` and `createOrUpdateContextMenu()` make everyday extension code easier to write, read, and discover in your editor.
- **Async code that reads naturally.** Promise-based wrappers let you use `async`/`await` with callback-style Chrome APIs.
- **Events with easy cleanup.** Every event helper returns an unsubscribe function `() => void`, so you can stop listening as soon as the work is done.
- **TypeScript at every step.** Types based on `@types/chrome`, including explicit event parameter types, bring editor guidance to API calls and listeners alike.
- **Compatibility where it matters.** Helpers handle MV2/MV3 and browser differences where applicable, including Action, Tabs MV2 helpers, and Sidebar.
- **Import what you use.** Named imports, small focused utilities, and a tree-shakable build (`sideEffects: false`) let your bundler leave unused helpers out.

## Installation

### npm

```bash
npm i @addon-core/browser
```

### yarn

```bash
yarn add @addon-core/browser
```

### pnpm

```bash
pnpm add @addon-core/browser
```

## Usage examples

A few everyday extension tasks, from toolbar actions to content-script messaging.

### Action API across MV2 and MV3

```ts
import {setActionPopup, setBadgeText} from "@addon-core/browser";

await setActionPopup("popup.html");
await setBadgeText("ON");
```

Use the same helper across manifest versions: `setActionPopup()` works with `chrome.action` in Manifest V3 and `chrome.browserAction` in Manifest V2.

### Tabs and events

```ts
import {getActiveTab, onTabUpdated} from "@addon-core/browser";

const tab = await getActiveTab();

const off = onTabUpdated((tabId, changeInfo) => {
  if (tabId === tab.id && changeInfo.status === "complete") {
    off();
  }
});
```

Listen for the update you need, then call `off()` to unsubscribe. Every event helper follows the same cleanup pattern.

### Context menus and tab messaging

```ts
import {createOrUpdateContextMenu, onContextMenusClicked, sendTabMessage} from "@addon-core/browser";

await createOrUpdateContextMenu("save-selection", {
  title: "Save selection",
  contexts: ["selection"],
});

const off = onContextMenusClicked(async (info, tab) => {
  if (info.menuItemId !== "save-selection" || !tab?.id) {
    return;
  }

  await sendTabMessage(tab.id, {
    type: "save-selection",
    text: info.selectionText,
  });
});
```

Create or update a menu with one call, then pass the selection to a content script. `createOrUpdateContextMenu()` avoids duplicate-menu errors during extension reloads, and `sendTabMessage()` keeps the background-to-content-script path promise-based.

## Supported Chrome APIs

Explore the API guides for available helpers, examples, and browser-specific details.

- [action](docs/action.md) — MV2/MV3 compatible; under the hood uses `chrome.action` (MV3) or `chrome.browserAction` (MV2) automatically.
- [alarms](docs/alarms.md)
- [audio](docs/audio.md)
- [bookmarks](docs/bookmarks.md) — Bookmark trees, native editing and event subscriptions.
- [browsingData](docs/browsing-data.md)
- [commands](docs/commands.md)
- [contextMenus](docs/context-menus.md)
- [cookies](docs/cookies.md)
- [declarativeNetRequest](docs/declarative-net-request.md) — Dnr methods for native rules, regex support and debug events.
- [documentScan](docs/document-scan.md)
- [downloads](docs/downloads.md)
- [extension](docs/extension.md)
- [history](docs/history.md)
- [i18n](docs/i18n.md)
- [identity](docs/identity.md) — Chrome full support; Firefox, Edge, and Opera support the portable web auth flow; Safari is not supported.
- [idle](docs/idle.md)
- [management](docs/management.md)
- [notifications](docs/notifications.md)
- [offscreen](docs/offscreen.md)
- [permissions](docs/permissions.md)
- [runtime](docs/runtime.md)
- [scripting](docs/scripting.md)
- [search](docs/search.md) — Default-provider search and Firefox engine selection; Safari limitations and a Tabs API example.
- [sidebar](docs/sidebar.md) — Unified helpers for Chrome Side Panel (MV3) and Firefox/Opera `sidebarAction`.
- [storage](https://github.com/addon-stack/storage) — via separate package: [@addon-core/storage](https://www.npmjs.com/package/@addon-core/storage)
- [tabCapture](docs/tab-capture.md)
- [tabGroups](docs/tab-groups.md) — Read, update and move tab groups, with native event subscriptions.
- [tabs](docs/tabs.md)
- [topSites](docs/top-sites.md) — Most-visited sites with optional Firefox query settings.
- [userScripts](docs/user-scripts.md)
- [webNavigation](docs/web-navigation.md)
- [webRequest](docs/web-request.md)
- [windows](docs/windows.md)

## Helpers

- [env](docs/env.md) — Safe background-context detection with `isBackground()`.
- [browserDetection](docs/browser-detection.md) — Best-effort browser detection with `BrowserName`, `BrowserFamily`, `guessBrowser()`, `isBrowser()`, and `isBrowserFamily()`.

## Supported browsers

- Google Chrome (MV2 & MV3)
- Microsoft Edge (Chromium)
- Opera (Chromium) — plus sidebar helpers
- Other Chromium-based browsers (e.g., Brave, Vivaldi, Arc, Yandex, Chromium) — expected to work; behavior aligns with Chrome.
- Firefox — partial support via compatible helpers (e.g., `sidebarAction`, `runtime.getBrowserInfo`)
- Apple Safari — limited WebExtensions support; many Chromium-specific APIs are not available, so some helpers won’t work.

## TypeScript compatibility

The package depends on `@types/chrome@^0.3.0`, which owns the global `browser` alias
(`typeof chrome`). Our declarations extend that shared API shape with Firefox-only
`sidebarAction`, `runtime.getBrowserInfo`, and search engine methods, plus the existing legacy APIs. They do
not redeclare the `browser` value. The previous type names
`browser.runtime.BrowserInfo` and `browser.sidebarAction.ImageDataType` remain available.

These declarations are a cross-browser superset, not a guarantee of runtime availability:
Chrome's `browser` alias does not provide Firefox-only APIs. Keep feature detection
when calling vendor-specific APIs directly. Applications with an explicit dependency on
older `@types/chrome` should update it to the same range to avoid mixing global declarations.

## Testing

Test extension behavior with your preferred runner using [`@addon-core/browser/testing`](docs/testing.md). It provides deterministic fixtures, configurable browser methods and events, stateful runtime/permissions/tabs/windows/scripting fakes, and reversible browser-global installation. Importing it never changes `globalThis`, and it has no dependency on Jest or another test runner.

Production API integration tests run in real Chromium and Firefox extensions through `npm run test:browser`.
See the [browser test guide](tests/browser/README.md) for setup, per-API scenarios and permission profiles.

## Utilities

For finer control, `@addon-core/browser/utils` exposes the low-level utilities used primarily inside the package for error handling, promise management, and listener safety.

For a complete list of utility functions and examples, see the [Utilities Documentation](docs/utils.md).

## Not yet covered

The following commonly used WebExtensions/Chrome Extension APIs are not wrapped yet. Chrome OS–only APIs are intentionally omitted.

Want to help expand coverage? See [CONTRIBUTING.md](CONTRIBUTING.md) to get started, or open an issue to discuss an API you need.

- contentSettings
- declarativeContent
- desktopCapture
- devtools.* (inspectedWindow, network, panels)
- dns
- fontSettings
- omnibox
- pageCapture
- platformKeys
- power
- privacy
- proxy
- sessions
- system.cpu
- system.memory
- system.storage
- tts
- ttsEngine

## API stability and versioning

The `1.x` series is a period of shaping the package's public API contracts and working toward comprehensive coverage
of currently available WebExtension and Chrome APIs. As this work progresses, method signatures, TypeScript types,
and runtime behavior may change. **Minor releases in `1.x` may include breaking changes**
(for example, `1.0.0` → `1.1.0`).

**Version `2.0.0` will mark the transition to stable public API contracts.** It will be released through an explicit
maintainer decision when those contracts are ready. Starting with `2.0.0`, breaking changes will require a major release
(for example, `2.4.0` → `3.0.0`), while minor releases will add backward-compatible functionality.
Patch releases preserve backward compatibility at every version, including public TypeScript types and runtime behavior.

To allow only patch updates within a chosen minor version, use `~` in your application's `package.json`:

```json
{
  "dependencies": {
    "@addon-core/browser": "~1.0.0"
  }
}
```

`~1.0.0` allows `1.0.1`, `1.0.2`, and later `1.0.x` patches, but excludes `1.1.0` and `2.0.0`.
Use `"1.0.0"` without a prefix to pin one exact version. `^1.0.0` also permits minor updates,
which may contain breaking changes during the `1.x` series.

Before upgrading, review the [Release Notes](https://github.com/addon-stack/browser/releases) for breaking changes
and migration instructions. Commit your lockfile for reproducible installs; the version range determines which updates
are allowed when you update dependencies.
See the [versioning policy](CONTRIBUTING.md#commits-conventional-commits-and-versioning) for details.
