import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {type BrowserHarness, createBrowserHarness, installBrowserGlobals} from "../../testing";
import * as api from "./methods";

describe.each(["chrome", "firefox"] as const)("i18n methods in %s", profile => {
    let harness: BrowserHarness;
    let restore: () => void;

    beforeEach(() => {
        harness = createBrowserHarness();
        restore = installBrowserGlobals(harness, {profile});
    });

    afterEach(() => restore());

    test("detectI18Language preserves the text and language probabilities", async () => {
        const result = {isReliable: true, languages: [{language: "ru", percentage: 100}]};
        const method = harness.configurable.active.i18n.detectLanguage;
        method.setResult(result);
        await expect(api.detectI18Language("Привет")).resolves.toBe(result);
        expect(method.calls[0].args).toEqual(["Привет"]);
    });

    test.each([{languages: ["en-US", "ru"]}, {languages: []}])("getI18nAcceptLanguages preserves $languages", async ({languages}) => {
        const method = harness.configurable.active.i18n.getAcceptLanguages;
        method.setResult(languages);
        await expect(api.getI18nAcceptLanguages()).resolves.toBe(languages);
        expect(method.calls[0].args).toEqual([]);
    });

    test.each(["ru", ""])("synchronous language and message methods preserve %s", result => {
        const native = harness.configurable.active.i18n;
        native.getUILanguage.setResult(result);
        native.getMessage.setResult(result);
        expect(api.getI18nUILanguage()).toBe(result);
        expect(api.getI18nMessage("title")).toBe(result);
        expect(native.getUILanguage.calls[0].args).toEqual([]);
        expect(native.getMessage.calls[0].args).toEqual(["title"]);
    });

    test.each([
        ["detectLanguage", () => api.detectI18Language("")],
        ["getAcceptLanguages", api.getI18nAcceptLanguages],
    ] as const)("%s propagates native errors", async (name, invoke) => {
        harness.configurable.active.i18n[name].failNext(new Error("Language lookup failed"));
        await expect(invoke()).rejects.toThrow("Language lookup failed");
        expect(harness.runtime.lastError).toBeUndefined();
    });

    test.each([
        ["getUILanguage", api.getI18nUILanguage],
        ["getMessage", () => api.getI18nMessage("title")],
    ] as const)("%s preserves synchronous failures", (name, invoke) => {
        const error = new Error("Language lookup failed");
        harness.configurable.active.i18n[name].failNext(error);
        expect(invoke).toThrow(error);
    });

    test.each(["ru", undefined])("getDefaultLanguage reads default_locale=%s from the manifest", default_locale => {
        harness.runtime.getManifest.setResult({manifest_version: 3, name: "Test", version: "1.0", default_locale});
        expect(api.getDefaultLanguage()).toBe(default_locale);
        expect(harness.runtime.getManifest.calls[0].args).toEqual([]);
    });

    test("getDefaultLanguage preserves manifest errors", () => {
        const error = new Error("Manifest unavailable");
        harness.runtime.getManifest.failNext(error);
        expect(api.getDefaultLanguage).toThrow(error);
    });
});
