import {detectI18Language, getDefaultLanguage, getI18nAcceptLanguages, getI18nMessage, getI18nUILanguage} from "@addon-core/browser";

type LanguageDetectionResult = chrome.i18n.LanguageDetectionResult;

const methods = {detectI18Language, getI18nAcceptLanguages, getI18nUILanguage, getI18nMessage, getDefaultLanguage};

type Expected = {
    detectI18Language: (text: string) => Promise<LanguageDetectionResult>;
    getI18nAcceptLanguages: () => Promise<string[]>;
    getI18nUILanguage: () => string | undefined;
    getI18nMessage: (key: string) => string | undefined;
    getDefaultLanguage: () => string | undefined;
};

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signaturesUnchanged: Equal<typeof methods, Expected> = true;
void [methods, signaturesUnchanged];
