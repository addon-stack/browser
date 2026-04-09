# @addon-core/browser

A TypeScript promise-based wrapper for Chrome Extension APIs, supporting both Manifest V2 and V3 across Chrome, Opera, Edge, and other Chromium-based browsers.

[![npm version](https://img.shields.io/npm/v/%40addon-core%2Fbrowser.svg?logo=npm&style=for-the-badge)](https://www.npmjs.com/package/@addon-core/browser)
[![npm downloads](https://img.shields.io/npm/dm/%40addon-core%2Fbrowser.svg?style=for-the-badge&color=blue)](https://www.npmjs.com/package/@addon-core/browser)
[![CI](https://img.shields.io/github/actions/workflow/status/addon-stack/browser/ci.yml?style=for-the-badge)](https://github.com/addon-stack/browser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE.md)

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

## Supported browsers

- Google Chrome (MV2 & MV3)
- Microsoft Edge (Chromium)
- Opera (Chromium) — plus sidebar helpers
- Other Chromium-based browsers (e.g., Brave, Vivaldi, Arc, Yandex, Chromium) — expected to work; behavior aligns with Chrome.
- Firefox — partial support via compatible helpers (e.g., `sidebarAction`, `runtime.getBrowserInfo`)
- Apple Safari — limited WebExtensions support; many Chromium-specific APIs are not available, so some helpers won’t work.

## Supported Chrome APIs

- [action](docs/action.md) — MV2/MV3 compatible; under the hood uses `chrome.action` (MV3) or `chrome.browserAction` (MV2) automatically.
- [alarms](docs/alarms.md)
- [audio](docs/audio.md)
- [browsingData](docs/browsingData.md)
- [commands](docs/commands.md)
- [contextMenus](docs/contextMenus.md)
- [cookies](docs/cookies.md)
- [documentScan](docs/documentScan.md)
- [downloads](docs/downloads.md)
- [extension](docs/extension.md)
- [history](docs/history.md)
- [i18n](docs/i18n.md)
- [idle](docs/idle.md)
- [management](docs/management.md)
- [notifications](docs/notifications.md)
- [offscreen](docs/offscreen.md)
- [permissions](docs/permissions.md)
- [runtime](docs/runtime.md)
- [scripting](docs/scripting.md)
- [sidebar](docs/sidebar.md) — Unified helpers for Chrome Side Panel (MV3) and Firefox/Opera `sidebarAction`.
- [storage](https://github.com/addon-stack/storage) — via separate package: [@addon-core/storage](https://www.npmjs.com/package/@addon-core/storage)
- [tabCapture](docs/tabCapture.md)
- [tabs](docs/tabs.md)
- [userScripts](docs/userScripts.md)
- [webNavigation](docs/webNavigation.md)
- [webRequest](docs/webRequest.md)
- [windows](docs/windows.md)

## Why this package

- Promise-based wrappers for callback-style Chrome APIs.
- All event helpers return an unsubscribe function `() => void`.
- Concise, consistent function names (easier to read and auto-complete).
- Strong TypeScript types (based on `@types/chrome`) with explicit event parameter types.
- Tree-shakable build (`sideEffects: false`) and small, focused utilities.
- MV2/MV3 compatibility handled internally where applicable (e.g., Action, Tabs MV2 helpers, Sidebar cross-browser helpers).

## Usage examples

- setActionPopup (works in MV2 & MV3):

```ts
import { setActionPopup } from "@addon-core/browser";

await setActionPopup("popup.html");
// Optional per-tab usage (when you have a tab id):
// await setActionPopup("popup.html", someTabId);
```

- getCurrentTab:

```ts
import { getCurrentTab } from "@addon-core/browser";

const tab = await getCurrentTab();
if (tab?.id) {
  console.log("Current tab id:", tab.id);
}
```

- onTabUpdated (with unsubscribe):

```ts
import { onTabUpdated } from "@addon-core/browser";

const off = onTabUpdated((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    console.log("Tab finished loading:", tabId, tab.url);
  }
});

// Later, to stop listening:
off();
```

## Utilities

In addition to Chrome API wrappers, this package provides a set of low-level utilities for error handling, promise management, and listener safety. While these are primarily used internally, they are also exported via the `@addon-core/browser/utils` subpath for advanced usage.

For a complete list of utility functions and examples, see the [Utilities Documentation](docs/utils.md).


## Not yet covered

These commonly used WebExtensions/Chrome Extension APIs are not wrapped here yet (Chrome OS–only APIs are intentionally omitted). If you’d like to contribute, please see [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue/PR.

- bookmarks
- contentSettings
- declarativeContent
- declarativeNetRequest (and declarativeNetRequestFeedback)
- desktopCapture
- devtools.* (inspectedWindow, network, panels)
- dns
- fontSettings
- identity
- identityProvider
- omnibox
- pageCapture
- platformKeys
- power
- privacy
- proxy
- search
- sessions
- system.cpu
- system.memory
- system.storage
- tabGroups
- topSites
- tts
- ttsEngine