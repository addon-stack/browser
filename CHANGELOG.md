# Changelog

## 🚀 Release `@addon-core/browser` v0.4.0 (2025-09-29)

### ✨ Features

* **commands:** add `onSpecificCommand` listener with tab support ([af2aca7](https://github.com/addon-stack/browser/commit/af2aca7a6e51dd5373226518e46cd8a2509dc002))

  - Introduced a new `onSpecificCommand` method to handle specific command logic.
  - Included optional tab parameter to enhance callback functionality.

* **commands:** fix import order and adjust `onSpecificCommand` typing ([a46c703](https://github.com/addon-stack/browser/commit/a46c703da04110de594efc6ba3844d05a9eb8bca))

  - Reordered `handleListener` import for consistency across modules.
  - Refined `onSpecificCommand` type signature for better readability.

* migrate to Biome formatter, enhance linting, and setup Husky hooks ([57cd2f2](https://github.com/addon-stack/browser/commit/57cd2f20f772a5d6416618ba2f72c210aad07767))

  - Replaced Prettier with Biome for formatting and linting configuration.
  - Added Husky hooks (`commit-msg`, `pre-commit`, `pre-push`) for enhanced Git workflows.
  - Updated project metadata in `package.json`,
    including repository details, contributors, and scripts.
  - Refined dependencies and updated `package-lock.json` to reflect changes.

* **sidebar:** add setIcon and clearBadgeText methods ([eed6b3e](https://github.com/addon-stack/browser/commit/eed6b3e217bd696ae345bf6f26d256e05f1dfb5c))


* **tabs:** convert promise chains to async/await and add new helper methods ([d678a77](https://github.com/addon-stack/browser/commit/d678a77487aac9fc4909c22f4071fbad93fb5b3a))

  - Refactored `findTab` and `findTabById` to use async/await syntax for improved readability.
  - Added `findTabByUrl` to retrieve the first tab matching a specific URL.
  - Introduced `openOrCreateTabByUrl` to handle opening or creating a tab based on URL presence.

* **userScripts:** refine typings and enhance method flexibility ([21e4181](https://github.com/addon-stack/browser/commit/21e41814411dd8672ea7fc512169c6b3a9e33258))

  - Added `UserScriptInjection` and `InjectionResult` types for improved type safety.
  - Introduced `executeUserScript` method to simplify script execution handling.
  - Updated `resetUserScriptsWorldConfigs` to accept optional `worldId` for more flexibility.
  - Improved filtering logic in `getUserScripts` and `unregisterUserScripts` for better reusability.
  - Added `isAvailableUserScripts` method for checking userScripts API availability.

* **windows:** add windows API ([fc64cd1](https://github.com/addon-stack/browser/commit/fc64cd167e50542c3d629bf46b6bddc2bd68dafa))



### 🐛 Bug Fixed

* **scripting:** remove redundant async keyword in Promise executor ([83044d2](https://github.com/addon-stack/browser/commit/83044d2a27a03d672f1e8b2b9670200461978e7e))


* update npm publish args for public access ([61a0676](https://github.com/addon-stack/browser/commit/61a06764495399d5b0792b0e9c8ba30a489bb2e1))



### 🤖 CI

* add `release-it` and `release-it/conventional-changelog` ([9897c56](https://github.com/addon-stack/browser/commit/9897c5648db9ae9909c1c983b2a60aa73181a8ef))

  - Introduced `release-it` for automating versioning and publishing workflows.
  - Added `release-it/conventional-changelog` for generating changelogs using Conventional Commits.


### 🛠️ Refactoring

* **alarms:** simplify alarms typing and update `getAlarm` return type ([725b5d3](https://github.com/addon-stack/browser/commit/725b5d3f798f979661b76da312a10a58ca4a9cef))

  - Removed redundant type assertion in `alarms` function.
  - Updated `getAlarm` to explicitly return `Promise<Alarm | undefined>`.

* **downloads:** reorder imports and update method typings ([dd8c27b](https://github.com/addon-stack/browser/commit/dd8c27bc07e2b4444f7a7c764308653ffcd79c67))

  - Adjusted `handleListener` import order for consistency.
  - Updated method return types, including `getDownloadFileIcon` and `openDownload`, for better precision.
  - Added typings refinements, such as template literal types for `getDownloadState`.
  - Reorganized comments to enhance code readability.

* **fileBrowserHandler:** rename `onExecute` to `onFileBrowserHandlerExecute` ([37dcd84](https://github.com/addon-stack/browser/commit/37dcd84b201e97aeec8ecbd6351eb84232b618c9))


* **history:** reorder imports and update type definitions ([37f90b1](https://github.com/addon-stack/browser/commit/37f90b175ce72f3a500d9238b143210b8060917f))

  - Adjusted `handleListener` import order for better modularity.
  - Renamed `Url` type to `UrlDetails` for improved clarity and specificity.
  - Simplified `history` function by removing redundant type assertion.

* **idle:** reorder imports and update method typings ([942ce72](https://github.com/addon-stack/browser/commit/942ce72a7f5fbd6a50cab6bf5072f99e0cd0ae55))

  - Adjusted `handleListener` import order for consistency.
  - Updated `queryIdleState` return type to use template literal type for improved precision.
  - Simplified the `idle` function by removing unnecessary type assertion.

* **notifications:** rename `isSupportNotifications` to `isAvailableNotifications` ([93a962a](https://github.com/addon-stack/browser/commit/93a962a73d55e2d5a1c7884afd91c09703087eca))


* **notifications:** rename methods for consistency ([1067e56](https://github.com/addon-stack/browser/commit/1067e564a5a5e54193a75b43ba46be6d57a65d71))

  - Renamed `getAllNotification` to `getAllNotifications`.
  - Renamed `clearAllNotification` to `clearAllNotifications`.

* **notifications:** reorder imports and optimize clearAllNotification ([c2ad5c1](https://github.com/addon-stack/browser/commit/c2ad5c115d367cf6a52a22ab490ba870efbedfba))

  - Adjusted `handleListener` import order for consistency across modules.
  - Optimized `clearAllNotification` logic by using `Promise.all` to handle asynchronous operations.

* remove fileBrowserHandler export and related implementation ([03fff5c](https://github.com/addon-stack/browser/commit/03fff5ca9d25eb87824f8ce5b2bccf71ab57ffe3))


* remove redundant type assertions in API modules ([c696ef9](https://github.com/addon-stack/browser/commit/c696ef9176a043f98580f94a38a97a371010ddde))

  - Simplified multiple API modules by removing unnecessary type assertions.
  - Affected modules include `documentScan`, `sidebar`, `contextMenus`, `browsingData`, and others.

* reorder imports and refine typings ([45de7cc](https://github.com/addon-stack/browser/commit/45de7cc14464cb20f327770fcb47fb81aed0a0ff))

  - Adjusted `safeListener` import order in `webNavigation.ts` and `webRequest.ts` for consistency.
  - Updated `safeListener` return type in `utils.ts` to use `undefined` instead of `void`.

* replace `@ts-ignore` with `@ts-expect-error` and optimize imports ([a4df181](https://github.com/addon-stack/browser/commit/a4df181490345abcd33f18745b20dcac1e67196c))

  - Replaced `@ts-ignore` with `@ts-expect-error` in `env.ts` for better type safety.
  - Optimized import order in multiple modules by reordering `handleListener`.

* **runtime:** update import and improve type precision ([3363c65](https://github.com/addon-stack/browser/commit/3363c65cf3b1936d6392d4204dd074554e81f3de))

  - Changed `FirefoxRuntime` import to use `type` for better readability and tree-shaking.
  - Refined `RequestUpdateCheck.status` to use a template literal type for enhanced precision.

* **sidebar:** improve type safety and simplify API handling ([b95cdc5](https://github.com/addon-stack/browser/commit/b95cdc51158b9e7416442e7913162a32c9fa4c97))

  - Updated imports to use `type` keyword for better readability and tree-shaking.
  - Introduced `sidePanel` and `sidebarAction` helpers to simplify API availability checks.
  - Replaced redundant function calls with variable assignments for reuse.
  - Enhanced error and warning messages for unsupported browser features.
  - Streamlined Promise logic by reducing duplicate statements and improving clarity.

* **tabs:** update method typings and reorder imports for consistency ([fb8a64a](https://github.com/addon-stack/browser/commit/fb8a64ad6a23ce987afc90c1f9173d94c478af4f))

