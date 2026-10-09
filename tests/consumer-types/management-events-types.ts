import {onExtensionDisabled, onExtensionEnabled, onExtensionInstalled, onExtensionUninstalled} from "@addon-core/browser";

type NativeArguments = {
    onExtensionDisabled: Parameters<typeof chrome.management.onDisabled.addListener>;
    onExtensionEnabled: Parameters<typeof chrome.management.onEnabled.addListener>;
    onExtensionInstalled: Parameters<typeof chrome.management.onInstalled.addListener>;
    onExtensionUninstalled: Parameters<typeof chrome.management.onUninstalled.addListener>;
};

const wrappers = {onExtensionDisabled, onExtensionEnabled, onExtensionInstalled, onExtensionUninstalled};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onExtensionDisabled(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onExtensionDisabled(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onExtensionDisabled((_payload: number) => undefined);
