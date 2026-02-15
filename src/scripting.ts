import {browser} from "./browser";
import {callWithPromise} from "./utils";

type Awaited<T> = chrome.scripting.Awaited<T>;
type ContentScriptFilter = chrome.scripting.ContentScriptFilter;
type CSSInjection = chrome.scripting.CSSInjection;
type InjectionResult<T> = chrome.scripting.InjectionResult<T>;
type RegisteredContentScript = chrome.scripting.RegisteredContentScript;
type ScriptInjection<Args extends any[], Result> = chrome.scripting.ScriptInjection<Args, Result>;

const scripting = () => browser().scripting;

// Methods
export const executeScript = <T = any>(injection: ScriptInjection<any, T>): Promise<InjectionResult<Awaited<T>>[]> =>
    callWithPromise(cb => scripting().executeScript(injection, cb));

export const getRegisteredContentScripts = (filter?: ContentScriptFilter): Promise<RegisteredContentScript[]> =>
    callWithPromise(cb => scripting().getRegisteredContentScripts(filter || {}, cb));

export const insertCss = (injection: CSSInjection): Promise<void> =>
    callWithPromise(cb => scripting().insertCSS(injection, cb));

export const registerContentScripts = (scripts: RegisteredContentScript[]): Promise<void> =>
    callWithPromise(cb => scripting().registerContentScripts(scripts, cb));

export const removeCss = (injection: CSSInjection): Promise<void> =>
    callWithPromise(cb => scripting().removeCSS(injection, cb));

export const unregisterContentScripts = (filter?: ContentScriptFilter): Promise<void> =>
    callWithPromise(cb => scripting().unregisterContentScripts(filter || {}, cb));

export const updateContentScripts = (scripts: RegisteredContentScript[]): Promise<void> =>
    callWithPromise(cb => scripting().updateContentScripts(scripts, cb));

// Custom Methods
export const isAvailableScripting = (): boolean => !!scripting();
