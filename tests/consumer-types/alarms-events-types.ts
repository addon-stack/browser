import {clearAlarm, clearAllAlarm, createAlarm, createAlarmIfNotExists, getAlarm, getAllAlarm, onAlarm, onSpecificAlarm, onSpecificAlarms} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type NativeListener = Parameters<typeof chrome.alarms.onAlarm.addListener>[0];
const baseSignatureUnchanged: Equal<typeof onAlarm, (callback: NativeListener) => () => void> = true;
const customSignatureUnchanged: Equal<typeof onSpecificAlarm, (name: string, callback: NativeListener) => () => void> = true;
const mapSignature: Equal<typeof onSpecificAlarms, (handlers: Record<string, NativeListener>) => () => void> = true;

type ExpectedMethods = {
    clearAlarm: (name: string) => Promise<boolean>;
    clearAllAlarm: () => Promise<boolean>;
    createAlarm: (name: string, info: chrome.alarms.AlarmCreateInfo) => Promise<void>;
    createAlarmIfNotExists: (name: string, info: chrome.alarms.AlarmCreateInfo) => Promise<boolean>;
    getAlarm: (name: string) => Promise<chrome.alarms.Alarm | undefined>;
    getAllAlarm: () => Promise<chrome.alarms.Alarm[]>;
};

type ActualMethods = {
    clearAlarm: typeof clearAlarm;
    clearAllAlarm: typeof clearAllAlarm;
    createAlarm: typeof createAlarm;
    createAlarmIfNotExists: typeof createAlarmIfNotExists;
    getAlarm: typeof getAlarm;
    getAllAlarm: typeof getAllAlarm;
};

const methodSignaturesUnchanged: Equal<ActualMethods, ExpectedMethods> = true;
void [baseSignatureUnchanged, customSignatureUnchanged, methodSignaturesUnchanged, mapSignature];

const unsubscribe: () => void = onAlarm(alarm => {
    const currentAlarm: chrome.alarms.Alarm = alarm;
    void currentAlarm;
});

const unsubscribeSpecific: () => void = onSpecificAlarm("sync", async alarm => {
    const name: string = alarm.name;

    return name;
});

const unsubscribeMap: () => void = onSpecificAlarms({
    sync: async alarm => {
        const currentAlarm: chrome.alarms.Alarm = alarm;

        return currentAlarm.name;
    },
    cleanup: alarm => {
        const scheduledTime: number = alarm.scheduledTime;
        void scheduledTime;
    },
});

const unsubscribeEmptyMap: () => void = onSpecificAlarms({});

unsubscribe();
unsubscribeSpecific();
unsubscribeMap();
unsubscribeEmptyMap();
// @ts-expect-error Basic alarm events accept no registration filter.
onAlarm(() => undefined, {});
// @ts-expect-error Native listeners receive the complete alarm, not its name.
onAlarm((_name: string) => undefined);
// @ts-expect-error The alarm selector must be a string.
onSpecificAlarm(7, () => undefined);
// @ts-expect-error Filtered listeners still receive the complete alarm.
onSpecificAlarm("sync", (_name: string) => undefined);
// @ts-expect-error A map of alarm handlers is required.
onSpecificAlarms();
// @ts-expect-error Map values must be callbacks.
onSpecificAlarms({sync: true});
// @ts-expect-error Each handler receives the complete alarm, not its name.
onSpecificAlarms({sync: (_name: string) => undefined});
// @ts-expect-error Map subscriptions take only the handler map.
onSpecificAlarms({sync: () => undefined}, {});
