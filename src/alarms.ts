import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type Alarm = chrome.alarms.Alarm;
type AlarmCreateInfo = chrome.alarms.AlarmCreateInfo;

const alarms = () => browser().alarms;

// Methods
export const clearAlarm = (name: string): Promise<boolean> => callWithPromise(cb => alarms().clear(name, cb));

export const clearAllAlarm = (): Promise<boolean> => callWithPromise(cb => alarms().clearAll(cb));

export const createAlarm = (name: string, info: AlarmCreateInfo): Promise<void> =>
    callWithPromise(cb => alarms().create(name, info, cb));

export const getAlarm = (name: string): Promise<Alarm | undefined> => callWithPromise(cb => alarms().get(name, cb));

export const getAllAlarm = (): Promise<Alarm[]> => callWithPromise(cb => alarms().getAll(cb));

// Events
export const onAlarm = (callback: Parameters<typeof chrome.alarms.onAlarm.addListener>[0]): (() => void) => {
    return handleListener(alarms().onAlarm, callback);
};
