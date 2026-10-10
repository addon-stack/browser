import {browser} from "../browser";
import {callWithPromise} from "../utils";

type IdleState = chrome.idle.IdleState;

const idle = () => browser().idle;

// Methods
export const getIdleAutoLockDelay = (): Promise<number> => callWithPromise(cb => idle().getAutoLockDelay(cb));

export const queryIdleState = (detectionIntervalInSeconds: number): Promise<`${IdleState}`> =>
    callWithPromise(cb => idle().queryState(detectionIntervalInSeconds, cb));

export const setIdleDetectionInterval = (intervalInSeconds: number): void =>
    idle().setDetectionInterval(intervalInSeconds);
