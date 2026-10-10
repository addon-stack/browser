import {browser} from "../browser";
import {callWithPromise} from "../utils";

type Command = chrome.commands.Command;

const commands = () => browser().commands;

// Methods
export const getAllCommands = (): Promise<Command[]> => callWithPromise(cb => commands().getAll(cb));
