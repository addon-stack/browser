import {onPermissionsAdded, onPermissionsRemoved} from "@addon-core/browser";

type NativeArguments = {
    onPermissionsAdded: Parameters<typeof chrome.permissions.onAdded.addListener>;
    onPermissionsRemoved: Parameters<typeof chrome.permissions.onRemoved.addListener>;
};

const wrappers = {onPermissionsAdded, onPermissionsRemoved};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onPermissionsAdded(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onPermissionsAdded(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onPermissionsAdded((_payload: number) => undefined);
