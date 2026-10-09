import {configureUserScriptsWorld, executeUserScript, getUserScripts, getUserScriptsWorldConfigs, isAvailableUserScripts, registerUserScripts, resetUserScriptsWorldConfigs, unregisterUserScripts, updateUserScripts} from "@addon-core/browser";

type WorldProperties = chrome.userScripts.WorldProperties;
type RegisteredUserScript = chrome.userScripts.RegisteredUserScript;
type UserScriptInjection = chrome.userScripts.UserScriptInjection;
type InjectionResult = chrome.userScripts.InjectionResult;

const methods = {configureUserScriptsWorld, getUserScripts, getUserScriptsWorldConfigs, executeUserScript, registerUserScripts, resetUserScriptsWorldConfigs, unregisterUserScripts, updateUserScripts, isAvailableUserScripts};

type Expected = {
    configureUserScriptsWorld: (properties?: WorldProperties) => Promise<void>;
    getUserScripts: (ids?: string[]) => Promise<RegisteredUserScript[]>;
    getUserScriptsWorldConfigs: () => Promise<WorldProperties[]>;
    executeUserScript: (injection: UserScriptInjection) => Promise<InjectionResult[]>;
    registerUserScripts: (scripts: RegisteredUserScript[]) => Promise<void>;
    resetUserScriptsWorldConfigs: (worldId?: string) => Promise<void>;
    unregisterUserScripts: (ids?: string[]) => Promise<void>;
    updateUserScripts: (scripts: RegisteredUserScript[]) => Promise<void>;
    isAvailableUserScripts: () => boolean;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];

// @ts-expect-error Script ids must be strings.
getUserScripts([1]);
// @ts-expect-error User script injection sources cannot be empty.
executeUserScript({target: {tabId: 7}, js: []});
