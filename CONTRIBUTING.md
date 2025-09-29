# Contributor Guide (@addon-core/browser)

Thank you for your interest in contributing! This package is a promise‑oriented TypeScript wrapper around the Chrome Extensions API (MV2/MV3) with additional convenience helpers. Our goal is to cover all available APIs and simplify day‑to‑day extension development.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

Contents:
- Getting started
- GitFlow: branching and PRs
- Commits: Conventional Commits and versioning
- Scope: cover Chrome APIs and add helpers
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
- `npm run dev` — build in watch mode (tsup)
- `npm run build` — production build (tsup)
- `npm run lint` / `npm run lint:fix` — check/fix with Biome
- `npm run format` — format with Biome
- `npm run typecheck` — type-check with tsc
- `npm test` / `npm run test:ci` — tests (Jest)

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

How to add a new API wrapper:
1) Implementation
- Create `src/<api>.ts`.
- Wrap callback‑style APIs into `Promise` and call `throwRuntimeError()` inside callbacks.
- Events must return an unsubscribe function `() => void` (see `handleListener`/`safeListener`).
- Use precise types from `@types/chrome` (avoid `Parameters<>` in the final documentation — show real argument types).
- Keep function names concise and consistent (see existing modules).
- Where appropriate, add cross‑MV2/MV3 helpers and cross‑browser unification (examples: `action`, `sidebar`).

2) Export
- Re-export from `src/index.ts`.

3) Documentation
- Create `docs/<api>.md` following the template: “Documentation → Methods/Events (links to sections) → sections with real TypeScript signatures”.
- Update the list in `README.md` (link to the new file and add a brief description where it helps).

4) Tests
- Cover core scenarios: success, error (`runtime.lastError`), events (subscribe/unsubscribe behavior).

See the list of not-yet-covered APIs in the "Not yet covered" section of `README.md`.

---

## Code quality: lint, format, types

- Formatting/linting: [Biome](https://biomejs.dev/) — `npm run format`, `npm run lint`.
- Type checking: `npm run typecheck`.
- Husky + lint-staged run pre-commit checks (Biome and `jest --findRelatedTests`).

PRs with lint/type/build errors won’t be accepted.

---

## Tests

Framework: **Jest** (`npm test`). Recommendations:
- Mock `chrome.*` APIs (simple stubs/mocks are fine).
- Test error paths (`runtime.lastError`).
- For events, verify that the returned function actually removes the listener.
- Structure: co-locate tests with the module or use a `__tests__` folder.

In CI use `npm run test:ci`.

---

## Documentation

- For each new API, add a file under `docs/` and keep signatures accurate.
- Keep README concise and link to detailed per‑API docs in `docs/`.
- Maintain a consistent style and anchors for methods/events.

---

## Releases and publishing (GitHub Actions + release-it)

Releases are performed by maintainers.

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
