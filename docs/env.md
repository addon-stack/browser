# env

Helpers for identifying the current extension execution context.

## Methods

- [isBackground()](#isBackground)

<a name="isBackground"></a>

### isBackground

```ts
isBackground(): boolean
```

Returns `true` when the current context is identified as an MV3 background worker or an MV2 generated
background page. Returns `false` when the context cannot be identified, the API is unavailable, or reading
the manifest or environment fails. The check does not throw, log, or cache its result.

Detection uses the manifest and the presence of `window`; MV2 detection recognizes
`/_generated_background_page.html`. It does not identify custom MV2 background page paths.

```ts
import {isBackground} from "@addon-core/browser";

if (isBackground()) {
    // The current context was identified as a background context.
}
```
