# browserDetection

Best-effort browser detection for extension contexts.

Chrome does not expose a native `chrome.runtime.getBrowserInfo()` API. This helper combines available browser signals and returns where the guess came from, so callers can decide how much they trust the result.

## Methods

- [guessBrowser()](#guessBrowser)
- [isBrowser(guess, ...names)](#isBrowser)
- [isBrowserFamily(guess, family)](#isBrowserFamily)

## Enums

- `BrowserName`
- `BrowserFamily`
- `BrowserGuessSource`

---

<a name="guessBrowser"></a>

### guessBrowser

```ts
guessBrowser(): Promise<BrowserGuess>
```

Guesses the current browser using the best signal available in the current context.

```ts
import {BrowserName, guessBrowser, isBrowser} from "@addon-core/browser";

const guess = await guessBrowser();

if (isBrowser(guess, BrowserName.Firefox)) {
  // Firefox-specific path
}
```

The result contains the guessed browser name, browser family, source, and optional raw metadata:

```ts
interface BrowserGuess {
  name: BrowserName;
  family: BrowserFamily;
  source: BrowserGuessSource;
  rawName?: string;
  vendor?: string;
  version?: string;
}
```

Detection order:

1. Firefox `runtime.getBrowserInfo()`.
2. Chromium User-Agent Client Hints via `navigator.userAgentData`.
3. Brave-specific `navigator.brave`.
4. Browser-specific globals such as Opera or Safari globals.
5. Generic Chromium User-Agent Client Hints.
6. `navigator.userAgent`.
7. Extension URL protocol from `runtime.getURL("")`.

When no signal is available, the helper returns:

```ts
{
  name: BrowserName.Unknown,
  family: BrowserFamily.Unknown,
  source: BrowserGuessSource.Unknown
}
```

For capability checks, prefer feature detection. Use `guessBrowser()` when product logic, diagnostics, or analytics truly need a browser label.

<a name="isBrowser"></a>

### isBrowser

```ts
isBrowser(guess: BrowserGuess, ...names: BrowserName[]): boolean
```

Checks whether a browser guess matches one of the provided names.

```ts
import {BrowserName, guessBrowser, isBrowser} from "@addon-core/browser";

const guess = await guessBrowser();

if (isBrowser(guess, BrowserName.Edge, BrowserName.Chrome)) {
  // Chromium browser branch for Chrome or Edge
}
```

<a name="isBrowserFamily"></a>

### isBrowserFamily

```ts
isBrowserFamily(guess: BrowserGuess, family: BrowserFamily): boolean
```

Checks whether a browser guess belongs to a browser family.

```ts
import {BrowserFamily, guessBrowser, isBrowserFamily} from "@addon-core/browser";

const guess = await guessBrowser();

if (isBrowserFamily(guess, BrowserFamily.Chromium)) {
  // Chromium-family branch
}
```
