import {onCommand} from "./events";

type Tab = chrome.tabs.Tab;

export const onSpecificCommand = (command: string, callback: (tab?: Tab) => any): (() => void) => {
    return onCommand((name, tab) => {
        if (command === name) {
            return callback(tab);
        }
    });
};

export const onSpecificCommands = (handlers: Record<string, Parameters<typeof onSpecificCommand>[1]>): (() => void) => {
    return onCommand((name, tab) => {
        if (Object.prototype.hasOwnProperty.call(handlers, name)) {
            const callback = handlers[name];

            return callback(tab);
        }
    });
};
