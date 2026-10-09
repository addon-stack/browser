import {onIdleStateChanged} from "@addon-core/browser";

type NativeArguments = {
    onIdleStateChanged: Parameters<typeof chrome.idle.onStateChanged.addListener>;
};

const wrappers = {onIdleStateChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onIdleStateChanged(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onIdleStateChanged(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onIdleStateChanged((_payload: number) => undefined);
