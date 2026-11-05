import {executeScript, getRegisteredContentScripts, insertCss, registerContentScripts, removeCss, unregisterContentScripts, updateContentScripts} from "@addon-core/browser";

type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
type ContentScriptFilter = chrome.scripting.ContentScriptFilter;
type CSSInjection = chrome.scripting.CSSInjection;
type InjectionResult<T> = chrome.scripting.InjectionResult<T>;
type RegisteredContentScript = chrome.scripting.RegisteredContentScript;
type ScriptInjection<Args extends any[], Result> = chrome.scripting.ScriptInjection<Args, Result>;

const methods = {executeScript, getRegisteredContentScripts, insertCss, registerContentScripts, removeCss, unregisterContentScripts, updateContentScripts};

type Expected = {
    executeScript: <T = any>(injection: ScriptInjection<any, T>) => Promise<InjectionResult<Awaited<T>>[]>;
    getRegisteredContentScripts: (filter?: ContentScriptFilter) => Promise<RegisteredContentScript[]>;
    insertCss: (injection: CSSInjection) => Promise<void>;
    registerContentScripts: (scripts: RegisteredContentScript[]) => Promise<void>;
    removeCss: (injection: CSSInjection) => Promise<void>;
    unregisterContentScripts: (filter?: ContentScriptFilter) => Promise<void>;
    updateContentScripts: (scripts: RegisteredContentScript[]) => Promise<void>;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<Omit<typeof methods, "executeScript">, Omit<Expected, "executeScript">> = true;
// Conditional result aliases from different declaration files need assignability checks.
const compatibleExecuteScript: Expected["executeScript"] = executeScript;
declare const expectedExecuteScript: Expected["executeScript"];
const compatibleExpected: typeof executeScript = expectedExecuteScript;
void [methods, signaturesUnchanged, compatibleExecuteScript, compatibleExpected];

const pending: Promise<chrome.scripting.InjectionResult<number>[]> = executeScript<Promise<number>>({target: {tabId: 7}, func: async () => 42});
void pending;
// @ts-expect-error Injection targets remain required.
executeScript({func: () => 42});
