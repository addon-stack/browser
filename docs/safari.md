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

