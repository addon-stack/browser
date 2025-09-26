import {browser} from "./browser";
import {handleListener} from "./utils";
import {throwRuntimeError} from "./runtime";

type Command = chrome.commands.Command;
type Tab = chrome.tabs.Tab;

const commands = () => browser().commands;

// Methods
export const getAllCommands = (): Promise<Command[]> =>
    new Promise<Command[]>((resolve, reject) => {
        commands().getAll(commands => {
            try {
                throwRuntimeError();

                resolve(commands);
            } catch (e) {
                reject(e);
            }
        });
    });

// Events
export const onCommand = (callback: Parameters<typeof chrome.commands.onCommand.addListener>[0]): (() => void) => {
    return handleListener(commands().onCommand, callback);
};

export const onSpecificCommand = (command: string, callback: ((tab?: Tab) => any)): (() => void) => {
    return onCommand((name, tab) => {
        if (command === name) {
            callback(tab);
        }
    });
}
