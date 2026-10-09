import {onIdentitySignInChanged} from "@addon-core/browser";

type NativeArguments = {
    onIdentitySignInChanged: Parameters<typeof chrome.identity.onSignInChanged.addListener>;
};

const wrappers = {onIdentitySignInChanged};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onIdentitySignInChanged(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onIdentitySignInChanged(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onIdentitySignInChanged((_payload: number) => undefined);
