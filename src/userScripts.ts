import {browser} from "./browser";
import {throwRuntimeError} from "./runtime";

type WorldProperties = chrome.userScripts.WorldProperties;
type RegisteredUserScript = chrome.userScripts.RegisteredUserScript;
type UserScriptInjection = chrome.userScripts.UserScriptInjection;
type InjectionResult = chrome.userScripts.InjectionResult;

const userScripts = () => browser().userScripts;

// Methods
export const configureUserScriptsWorld = (properties?: WorldProperties): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        userScripts().configureWorld(properties || {}, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const getUserScripts = (ids?: string[]): Promise<RegisteredUserScript[]> =>
    new Promise<RegisteredUserScript[]>((resolve, reject) => {
        const filter = ids?.length ? {ids} : {};

        userScripts().getScripts(filter, scripts => {
            try {
                throwRuntimeError();

                resolve(scripts);
            } catch (e) {
                reject(e);
            }
        });
    });

export const getUserScriptsWorldConfigs = (): Promise<WorldProperties[]> =>
    new Promise<WorldProperties[]>((resolve, reject) => {
        userScripts().getWorldConfigurations(worlds => {
            try {
                throwRuntimeError();

                resolve(worlds);
            } catch (e) {
                reject(e);
            }
        });
    });

export const executeUserScript = (injection: UserScriptInjection): Promise<InjectionResult[]> =>
    new Promise<InjectionResult[]>((resolve, reject) => {
        userScripts().execute(injection, result => {
            try {
                throwRuntimeError();

                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
    });

export const registerUserScripts = (scripts: RegisteredUserScript[]): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        userScripts().register(scripts, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

export const resetUserScriptsWorldConfigs = (worldId?: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const callback = () => {
            try {
                throwRuntimeError();
                resolve();
            } catch (e) {
                reject(e);
            }
        };

        const {resetWorldConfiguration} = userScripts();

        if (typeof worldId === "string") {
            resetWorldConfiguration(worldId, callback);
        } else {
            resetWorldConfiguration(callback);
        }
    });

export const unregisterUserScripts = (ids?: string[]): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        const callback = () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        };

        const filter = ids?.length ? {ids} : {};

        userScripts().unregister(filter, callback);
    });

export const updateUserScripts = (scripts: RegisteredUserScript[]): Promise<void> =>
    new Promise<void>((resolve, reject) => {
        userScripts().update(scripts, () => {
            try {
                throwRuntimeError();

                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });

// Custom Methods
export const isAvailableUserScripts = (): boolean => !!userScripts();
