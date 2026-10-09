import {onHistoryVisited, onHistoryVisitRemoved} from "@addon-core/browser";

type NativeArguments = {
    onHistoryVisited: Parameters<typeof chrome.history.onVisited.addListener>;
    onHistoryVisitRemoved: Parameters<typeof chrome.history.onVisitRemoved.addListener>;
};

const wrappers = {onHistoryVisited, onHistoryVisitRemoved};
type Expected = {[K in keyof NativeArguments]: (...args: NativeArguments[K]) => () => void};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof wrappers, Expected> = true;
void [wrappers, signaturesUnchanged];

const unsubscribe: () => void = onHistoryVisited(() => undefined);
unsubscribe();
// @ts-expect-error Basic events accept no registration filter.
onHistoryVisited(() => undefined, {});
// @ts-expect-error The callback must receive the native payload, not a number.
onHistoryVisited((_payload: number) => undefined);
