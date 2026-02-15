import {browser} from "./browser";
import {callWithPromise, handleListener} from "./utils";

type Command = chrome.commands.Command;
type Tab = chrome.tabs.Tab;

const commands = () => browser().commands;

// Methods
export const getAllCommands = (): Promise<Command[]> => callWithPromise(cb => commands().getAll(cb));

// Events
export const onCommand = (callback: Parameters<typeof chrome.commands.onCommand.addListener>[0]): (() => void) => {
    return handleListener(commands().onCommand, callback);
};

export const onSpecificCommand = (command: string, callback: (tab?: Tab) => any): (() => void) => {
    return onCommand((name, tab) => {
        if (command === name) {
            callback(tab);
        }
    });
};
