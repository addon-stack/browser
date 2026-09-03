import {browser} from "./browser";
import {callWithPromise} from "./utils";

type WorldProperties = chrome.userScripts.WorldProperties;
type RegisteredUserScript = chrome.userScripts.RegisteredUserScript;
type UserScriptInjection = chrome.userScripts.UserScriptInjection;
type InjectionResult = chrome.userScripts.InjectionResult;

const userScripts = () => browser().userScripts;

// Methods
export const configureUserScriptsWorld = (properties?: WorldProperties): Promise<void> =>
    callWithPromise(() => userScripts().configureWorld(properties || {}));

export const getUserScripts = (ids?: string[]): Promise<RegisteredUserScript[]> => {
    const filter = ids?.length ? {ids} : {};

    return callWithPromise(cb => userScripts().getScripts(filter, cb));
};

export const getUserScriptsWorldConfigs = (): Promise<WorldProperties[]> =>
    callWithPromise(() => userScripts().getWorldConfigurations());

export const executeUserScript = (injection: UserScriptInjection): Promise<InjectionResult[]> =>
    callWithPromise(() => userScripts().execute(injection));

export const registerUserScripts = (scripts: RegisteredUserScript[]): Promise<void> =>
    callWithPromise(() => userScripts().register(scripts));

export const resetUserScriptsWorldConfigs = (worldId?: string): Promise<void> =>
    callWithPromise(() => {
        const {resetWorldConfiguration} = userScripts();

        if (typeof worldId === "string") {
            return resetWorldConfiguration(worldId);
        }

        return resetWorldConfiguration();
    });

export const unregisterUserScripts = (ids?: string[]): Promise<void> => {
    const filter = ids?.length ? {ids} : {};

    return callWithPromise(() => userScripts().unregister(filter));
};

export const updateUserScripts = (scripts: RegisteredUserScript[]): Promise<void> =>
    callWithPromise(() => userScripts().update(scripts));

// Custom Methods
export const isAvailableUserScripts = (): boolean => !!userScripts();
