import {browser} from "./browser";
import {getManifest, throwRuntimeError} from "./runtime";

type LanguageDetectionResult = chrome.i18n.LanguageDetectionResult

const i18n = () => browser().i18n as typeof chrome.i18n;

// Methods
export const detectI18Language = (text: string): Promise<LanguageDetectionResult> => new Promise<LanguageDetectionResult>((resolve, reject) => {
    i18n().detectLanguage(text, result => {
        try {
            throwRuntimeError();

            resolve(result);
        } catch (e) {
            reject(e);
        }
    });
});

export const getI18nAcceptLanguages = (): Promise<string[]> => new Promise<string[]>((resolve, reject) => {
    i18n().getAcceptLanguages(locales => {
        try {
            throwRuntimeError();

            resolve(locales);
        } catch (e) {
            reject(e);
        }
    });
});

export const getI18nUILanguage = (): string | undefined => {
    return i18n().getUILanguage();
}

export const getI18nMessage = (key: string): string | undefined => {
    return i18n().getMessage(key);
}


// Custom Methods
export const getDefaultLanguage = (): string | undefined => getManifest().default_locale;