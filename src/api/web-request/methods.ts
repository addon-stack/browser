import {browser} from "../browser";
import {callWithPromise} from "../utils";

const webRequest = () => browser().webRequest;

export const handlerWebRequestBehaviorChanged = (): Promise<void> =>
    callWithPromise(cb => webRequest().handlerBehaviorChanged(() => cb()));
