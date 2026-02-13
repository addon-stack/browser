import {browser} from "./browser";
import {callWithPromise} from "./utils";

type WorldProperties = chrome.userScripts.WorldProperties;
type RegisteredUserScript = chrome.userScripts.RegisteredUserScript;
type UserScriptInjection = chrome.userScripts.UserScriptInjection;
type InjectionResult = chrome.userScripts.InjectionResult;

const userScripts = () => browser().userScripts;

// Methods
export const configureUserScriptsWorld = (properties?: WorldProperties): Promise<void> =>
    callWithPromise(cb => userScripts().configureWorld(properties || {}, cb));

export const getUserScripts = (ids?: string[]): Promise<RegisteredUserScript[]> => {
    const filter = ids?.length ? {ids} : {};

    return callWithPromise(cb => userScripts().getScripts(filter, cb));
};

export const getUserScriptsWorldConfigs = (): Promise<WorldProperties[]> =>
    callWithPromise(cb => userScripts().getWorldConfigurations(cb));

export const executeUserScript = (injection: UserScriptInjection): Promise<InjectionResult[]> =>
    callWithPromise(cb => userScripts().execute(injection, cb));

export const registerUserScripts = (scripts: RegisteredUserScript[]): Promise<void> =>
    callWithPromise(cb => userScripts().register(scripts, cb));

export const resetUserScriptsWorldConfigs = (worldId?: string): Promise<void> =>
    callWithPromise(cb => {
        const {resetWorldConfiguration} = userScripts();

        if (typeof worldId === "string") {
            resetWorldConfiguration(worldId, cb);
        } else {
            resetWorldConfiguration(cb);
        }
    });

export const unregisterUserScripts = (ids?: string[]): Promise<void> => {
    const filter = ids?.length ? {ids} : {};

    return callWithPromise(cb => userScripts().unregister(filter, cb));
};

export const updateUserScripts = (scripts: RegisteredUserScript[]): Promise<void> =>
    callWithPromise(cb => userScripts().update(scripts, cb));

// Custom Methods
export const isAvailableUserScripts = (): boolean => !!userScripts();
