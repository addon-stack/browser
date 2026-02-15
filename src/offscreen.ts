import {browser} from "./browser";
import {callWithPromise} from "./utils";

type CreateParameters = chrome.offscreen.CreateParameters;

const offscreen = () => browser().offscreen;

// Methods
export const closeOffscreen = (): Promise<void> => callWithPromise(cb => offscreen().closeDocument(cb));

export const createOffscreen = (parameters: CreateParameters): Promise<void> =>
    callWithPromise(cb => offscreen().createDocument(parameters, cb));

export const hasOffscreen = (): Promise<boolean> => callWithPromise(cb => offscreen().hasDocument(cb));
