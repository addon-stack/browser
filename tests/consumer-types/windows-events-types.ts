import {
    onWindowBoundsChanged,
    onWindowCreated,
    onWindowFocusChanged,
    onWindowRemoved,
    type WindowEventFilter,
} from "@addon-core/browser";

type NativeArguments = {
    onWindowBoundsChanged: Parameters<typeof chrome.windows.onBoundsChanged.addListener>;
    onWindowCreated: Parameters<typeof chrome.windows.onCreated.addListener>;
    onWindowFocusChanged: Parameters<typeof chrome.windows.onFocusChanged.addListener>;
    onWindowRemoved: Parameters<typeof chrome.windows.onRemoved.addListener>;
};

const wrappers = {onWindowBoundsChanged, onWindowCreated, onWindowFocusChanged, onWindowRemoved};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
const filterUnchanged: Equal<WindowEventFilter, {windowTypes: `${chrome.windows.WindowType}`[]}> = true;
void [wrappers, signaturesUnchanged, filterUnchanged];

const filter: WindowEventFilter = {windowTypes: ["normal", "popup"]};

onWindowCreated(window => {
    const id: number | undefined = window.id; void id;
}, filter);

onWindowFocusChanged(windowId => {
    const id: number = windowId; void id;
});

onWindowRemoved(() => undefined, undefined);
onWindowBoundsChanged(() => undefined);

// @ts-expect-error WindowEventFilter retains its required windowTypes field.
onWindowCreated(() => undefined, {});
// @ts-expect-error Unknown window types must not be accepted.
onWindowRemoved(() => undefined, {windowTypes: ["invalid"]});
// @ts-expect-error Bounds changes do not accept a filter.
onWindowBoundsChanged(() => undefined, filter);
// @ts-expect-error Created listeners receive a Window, not an ID.
onWindowCreated((_id: number) => undefined);
