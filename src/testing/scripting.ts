import {cloneRecord} from "./internal";
import {type BrowserMethod, createBrowserMethod} from "./method";
import type {RuntimeLastErrorController, ScriptingTestApi} from "./types";

export interface ScriptingHarness {
    readonly api: ScriptingTestApi;
    readonly executeScript: BrowserMethod<
        typeof chrome.scripting.executeScript,
        chrome.scripting.InjectionResult<unknown>[]
    >;
    readonly getRegisteredContentScripts: BrowserMethod<
        typeof chrome.scripting.getRegisteredContentScripts,
        chrome.scripting.RegisteredContentScript[]
    >;
    readonly insertCSS: BrowserMethod<typeof chrome.scripting.insertCSS, void>;
    readonly registerContentScripts: BrowserMethod<typeof chrome.scripting.registerContentScripts, void>;
    readonly removeCSS: BrowserMethod<typeof chrome.scripting.removeCSS, void>;
    readonly unregisterContentScripts: BrowserMethod<typeof chrome.scripting.unregisterContentScripts, void>;
    readonly updateContentScripts: BrowserMethod<typeof chrome.scripting.updateContentScripts, void>;
    readonly registeredContentScripts: readonly chrome.scripting.RegisteredContentScript[];
    setRegisteredContentScripts(scripts: readonly chrome.scripting.RegisteredContentScript[]): void;
    reset(): void;
}

export const createScriptingHarness = (
    initialScripts: readonly chrome.scripting.RegisteredContentScript[] | undefined,
    lastError: RuntimeLastErrorController,
    nextSequence?: () => number
): ScriptingHarness => {
    const initial = (initialScripts ?? []).map(script => cloneRecord(script));
    let scripts = new Map(initial.map(script => [script.id, script]));

    const executeScript = createBrowserMethod<
        typeof chrome.scripting.executeScript,
        chrome.scripting.InjectionResult<unknown>[]
    >({callback: "last", invocation: "dual", lastError, name: "scripting.executeScript", nextSequence});

    const insertCSS = createBrowserMethod<typeof chrome.scripting.insertCSS, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "scripting.insertCSS",
        nextSequence,
    });

    const removeCSS = createBrowserMethod<typeof chrome.scripting.removeCSS, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "scripting.removeCSS",
        nextSequence,
    });

    const getRegisteredContentScripts = createBrowserMethod<
        typeof chrome.scripting.getRegisteredContentScripts,
        chrome.scripting.RegisteredContentScript[]
    >({
        callback: "last",
        implementation: ((
            filterOrCallback?:
                | chrome.scripting.ContentScriptFilter
                | ((value: chrome.scripting.RegisteredContentScript[]) => void),
            possibleCallback?: (value: chrome.scripting.RegisteredContentScript[]) => void
        ) => {
            const filter = typeof filterOrCallback === "function" ? {} : (filterOrCallback ?? {});
            const callback = typeof filterOrCallback === "function" ? filterOrCallback : possibleCallback;

            const result = [...scripts.values()]
                .filter(script => !filter.ids || filter.ids.includes(script.id))
                .map(script => cloneRecord(script));

            callback?.(result);

            return result;
        }) as unknown as typeof chrome.scripting.getRegisteredContentScripts,
        invocation: "dual",
        lastError,
        name: "scripting.getRegisteredContentScripts",
        nextSequence,
    });

    const registerContentScripts = createBrowserMethod<typeof chrome.scripting.registerContentScripts, void>({
        callback: "last",
        callbackArgs: () => [],
        implementation: ((values: chrome.scripting.RegisteredContentScript[], callback?: () => void) => {
            const duplicate = values.find(script => scripts.has(script.id));

            if (duplicate) {
                const error = new Error(`Content script "${duplicate.id}" is already registered`);

                if (callback) return lastError.runWithLastError(error, callback);

                throw error;
            }

            values.forEach(script => {
                scripts.set(script.id, cloneRecord(script));
            });

            callback?.();
        }) as unknown as typeof chrome.scripting.registerContentScripts,
        invocation: "dual",
        lastError,
        name: "scripting.registerContentScripts",
        nextSequence,
    });

    const updateContentScripts = createBrowserMethod<typeof chrome.scripting.updateContentScripts, void>({
        callback: "last",
        callbackArgs: () => [],
        implementation: ((values: chrome.scripting.RegisteredContentScript[], callback?: () => void) => {
            const missing = values.find(script => !scripts.has(script.id));

            if (missing) {
                const error = new Error(`Content script "${missing.id}" is not registered`);

                if (callback) return lastError.runWithLastError(error, callback);

                throw error;
            }

            values.forEach(script => {
                scripts.set(script.id, {...scripts.get(script.id), ...cloneRecord(script)});
            });

            callback?.();
        }) as unknown as typeof chrome.scripting.updateContentScripts,
        invocation: "dual",
        lastError,
        name: "scripting.updateContentScripts",
        nextSequence,
    });

    const unregisterContentScripts = createBrowserMethod<typeof chrome.scripting.unregisterContentScripts, void>({
        callback: "last",
        callbackArgs: () => [],
        implementation: ((
            filterOrCallback?: chrome.scripting.ContentScriptFilter | (() => void),
            possibleCallback?: () => void
        ) => {
            const filter = typeof filterOrCallback === "function" ? {} : filterOrCallback;
            const callback = typeof filterOrCallback === "function" ? filterOrCallback : possibleCallback;

            if (filter?.ids) {
                filter.ids.forEach(id => {
                    scripts.delete(id);
                });
            } else scripts.clear();

            callback?.();
        }) as unknown as typeof chrome.scripting.unregisterContentScripts,
        invocation: "dual",
        lastError,
        name: "scripting.unregisterContentScripts",
        nextSequence,
    });

    const api = {
        executeScript: executeScript.api,
        getRegisteredContentScripts: getRegisteredContentScripts.api,
        insertCSS: insertCSS.api,
        registerContentScripts: registerContentScripts.api,
        removeCSS: removeCSS.api,
        unregisterContentScripts: unregisterContentScripts.api,
        updateContentScripts: updateContentScripts.api,
    } as ScriptingTestApi;

    const methods = [
        executeScript,
        getRegisteredContentScripts,
        insertCSS,
        registerContentScripts,
        removeCSS,
        unregisterContentScripts,
        updateContentScripts,
    ];

    return {
        api,
        executeScript,
        getRegisteredContentScripts,
        insertCSS,
        registerContentScripts,
        removeCSS,
        unregisterContentScripts,
        updateContentScripts,
        get registeredContentScripts() {
            return [...scripts.values()].map(script => cloneRecord(script));
        },
        reset(): void {
            scripts = new Map(initial.map(script => [script.id, cloneRecord(script)]));

            methods.forEach(method => {
                method.reset();
            });
        },
        setRegisteredContentScripts(values): void {
            scripts = new Map(values.map(script => [script.id, cloneRecord(script)]));
        },
    };
};
