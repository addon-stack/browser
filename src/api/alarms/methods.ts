import {isWebKitExtension} from "../../internal/webkit";
import {browser} from "../browser";
import {callBrowserMethod, callWithPromise} from "../utils";

type Alarm = chrome.alarms.Alarm;
type AlarmCreateInfo = chrome.alarms.AlarmCreateInfo;

const alarms = () => browser().alarms;

const removalResult = (method: string, result: unknown, existed?: boolean): boolean => {
    if (typeof result === "boolean") {
        return result;
    }

    if (result === undefined && existed !== undefined) {
        return existed;
    }

    throw new Error(`The alarms.${method} API did not return a boolean removal result`);
};

/** Legacy WebKit uses a non-atomic existence check when native removal reports no result. */
export const clearAlarm = async (name: string): Promise<boolean> => {
    const existed = isWebKitExtension(browser()) ? (await getAlarm(name)) !== undefined : undefined;

    const result = await callBrowserMethod({
        callback: (api, done) => api.alarms.clear(name, done),
        promise: api => api.alarms.clear(name),
    });

    return removalResult("clear", result, existed);
};

/** Returns whether the collection was nonempty before deletion; the observation is not atomic. */
export const clearAllAlarm = async (): Promise<boolean> => {
    const existed = (await getAllAlarm()).length > 0;

    await callBrowserMethod({
        callback: (api, done) => api.alarms.clearAll(done),
        promise: api => api.alarms.clearAll(),
    });

    return existed;
};

export const createAlarm = (name: string, info: AlarmCreateInfo): Promise<void> =>
    callWithPromise(cb => {
        const api = browser();

        // Legacy WebKit rejects a callback and returns void; newer WebKit returns a Promise.
        if (isWebKitExtension(api)) {
            return Promise.resolve(api.alarms.create(name, info));
        }

        return api.alarms.create(name, info, cb);
    });

export const createAlarmIfNotExists = async (name: string, info: AlarmCreateInfo): Promise<boolean> => {
    const alarm = await getAlarm(name);

    if (alarm) {
        return false;
    }

    await createAlarm(name, info);

    return true;
};

export const getAlarm = async (name: string): Promise<Alarm | undefined> =>
    (await callWithPromise<Alarm | null | undefined>(cb => alarms().get(name, cb))) ?? undefined;

export const getAllAlarm = (): Promise<Alarm[]> => callWithPromise(cb => alarms().getAll(cb));
