import {closeOffscreen, createOffscreen, getOffscreenContext, getOffscreenPath, getOffscreenUrl, hasOffscreen, hasOffscreenPath, hasOffscreenUrl} from "@addon-core/browser";

type CreateParameters = chrome.offscreen.CreateParameters;
type ExtensionContext = chrome.runtime.ExtensionContext;

const methods = {closeOffscreen, createOffscreen, hasOffscreen, getOffscreenContext, getOffscreenUrl, getOffscreenPath, hasOffscreenUrl, hasOffscreenPath};

type Expected = {
    closeOffscreen: () => Promise<void>;
    createOffscreen: (parameters: CreateParameters) => Promise<void>;
    hasOffscreen: () => Promise<boolean>;
    getOffscreenContext: () => Promise<ExtensionContext | undefined>;
    getOffscreenUrl: () => Promise<string | undefined>;
    getOffscreenPath: () => Promise<string | undefined>;
    hasOffscreenUrl: (url: string) => Promise<boolean>;
    hasOffscreenPath: (path: string) => Promise<boolean>;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];
