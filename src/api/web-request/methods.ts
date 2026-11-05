import {requireApiMethod} from "../../internal/api-method";
import {browser} from "../browser";
import {callWithPromise} from "../utils";

const webRequest = () => browser().webRequest;

export const handlerWebRequestBehaviorChanged = (): Promise<void> =>
    callWithPromise(cb => requireApiMethod(webRequest(), "webRequest", "handlerBehaviorChanged")(() => cb()));
