import {onAlarm} from "./events";

export const onSpecificAlarm = (name: string, callback: Parameters<typeof onAlarm>[0]): (() => void) => {
    return onAlarm(alarm => {
        if (alarm.name === name) {
            return callback(alarm);
        }
    });
};

export const onSpecificAlarms = (handlers: Record<string, Parameters<typeof onAlarm>[0]>): (() => void) => {
    return onAlarm(alarm => {
        if (Object.prototype.hasOwnProperty.call(handlers, alarm.name)) {
            const callback = handlers[alarm.name];

            return callback(alarm);
        }
    });
};
