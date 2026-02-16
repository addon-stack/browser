import {browser} from "./browser";
import {getManifest} from "./runtime";
import {callWithPromise} from "./utils";

type LanguageDetectionResult = chrome.i18n.LanguageDetectionResult;

const i18n = () => browser().i18n;

// Methods
export const detectI18Language = (text: string): Promise<LanguageDetectionResult> =>
    callWithPromise(cb => i18n().detectLanguage(text, cb));

export const getI18nAcceptLanguages = (): Promise<string[]> => callWithPromise(cb => i18n().getAcceptLanguages(cb));

export const getI18nUILanguage = (): string | undefined => i18n().getUILanguage();

export const getI18nMessage = (key: string): string | undefined => i18n().getMessage(key);

// Custom Methods
export const getDefaultLanguage = (): string | undefined => getManifest().default_locale;
