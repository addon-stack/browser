import {onContextMenusClicked} from "@addon-core/browser";

type NativeArguments = {
    onContextMenusClicked: Parameters<typeof chrome.contextMenus.onClicked.addListener>;
};

const wrappers = {onContextMenusClicked};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onContextMenusClicked(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onContextMenusClicked(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onContextMenusClicked((_payload: number) => undefined);
