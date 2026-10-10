import {onCaptureStatusChanged} from "@addon-core/browser";

type NativeArguments = {
    onCaptureStatusChanged: Parameters<typeof chrome.tabCapture.onStatusChanged.addListener>;
};

const wrappers = {onCaptureStatusChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onCaptureStatusChanged(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onCaptureStatusChanged(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onCaptureStatusChanged((_payload: number) => undefined);
