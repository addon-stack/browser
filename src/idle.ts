import {browser} from "./browser";
import {throwRuntimeError} from "./runtime";
import {handleListener} from "./utils";

type IdleState = chrome.idle.IdleState;

const idle = () => browser().idle;

// Methods
export const getIdleAutoLockDelay = (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
        idle().getAutoLockDelay(delay => {
            try {
                throwRuntimeError();

                resolve(delay);
            } catch (e) {
                reject(e);
            }
        });
    });

export const queryIdleState = (detectionIntervalInSeconds: number): Promise<`${IdleState}`> =>
    new Promise<`${IdleState}`>((resolve, reject) => {
        idle().queryState(detectionIntervalInSeconds, newState => {
            try {
                throwRuntimeError();

                resolve(newState);
            } catch (e) {
                reject(e);
            }
        });
    });

export const setIdleDetectionInterval = (intervalInSeconds: number): void =>
    idle().setDetectionInterval(intervalInSeconds);

// Events
export const onIdleStateChanged = (
    callback: Parameters<typeof chrome.idle.onStateChanged.addListener>[0]
): (() => void) => {
    return handleListener(idle().onStateChanged, callback);
};
