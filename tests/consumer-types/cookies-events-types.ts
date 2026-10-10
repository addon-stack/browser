import {onCookieChanged} from "@addon-core/browser";

type NativeArguments = {
    onCookieChanged: Parameters<typeof chrome.cookies.onChanged.addListener>;
};

const wrappers = {onCookieChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onCookieChanged(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onCookieChanged(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onCookieChanged((_payload: number) => undefined);
