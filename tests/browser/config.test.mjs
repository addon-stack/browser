import {describe, expect, test} from "@jest/globals";

import {createManifest, parseOptions, selectSuites, validateReport} from "./config.mjs";

const profile = {id: "granted", permissions: ["search"], scenarios: [
    {id: "query"}, {id: "engines", browsers: ["firefox"]},
]};

const suite = {id: "search", browsers: ["chromium", "firefox"], profiles: [profile]};

describe("browser suite configuration", () => {
    test("selects an API and browser without accepting unknown flags or positional arguments", () => {
        expect(parseOptions(["--browser", "firefox", "--api", "search"], {FIREFOX_PATH: "/test/firefox"}))
            .toMatchObject({browser: "firefox", api: "search", binary: "/test/firefox"});

        expect(() => parseOptions(["--browser", "safari"])).toThrow("--browser");
        expect(() => parseOptions(["--browesr", "firefox"])).toThrow();
        expect(() => parseOptions(["search"])).toThrow();
        expect(selectSuites([suite], {browser: "chromium", api: "search"})).toEqual([suite]);
        expect(() => selectSuites([suite], {browser: "chromium", api: "missing"})).toThrow("Unknown API");
        expect(() => selectSuites([suite, suite], {browser: "chromium"})).toThrow("Duplicate");
        expect(() => selectSuites([{...suite, profiles: []}], {browser: "chromium"})).toThrow("No profiles");
    });

    test("permission profiles cannot inherit permissions from another fixture or a manifest override", () => {
        const template = {manifest_version: 3, permissions: ["search"], background: {service_worker: "background.js"}};
        const denied = {permissions: [], manifest: {firefox: {permissions: ["search"], name: "denied"}}};
        const positive = createManifest(template, profile, "chromium", "http://127.0.0.1:2345");
        const negative = createManifest(template, denied, "firefox", "http://127.0.0.1:2346");
        expect(positive.permissions).toEqual(["search"]);
        expect(negative.permissions).toEqual([]);
        expect(negative.host_permissions).toEqual(["http://127.0.0.1:2346/*"]);
        expect(template.permissions).toEqual(["search"]);
        expect(profile.permissions).toEqual(["search"]);
    });

    test("a report must contain exactly the selected scenarios, all passing", () => {
        const report = {suite: "search", profile: "granted", results: [{id: "query", status: "passed"}]};
        expect(() => validateReport(report, suite, profile, "chromium")).not.toThrow();
        expect(() => validateReport(report, suite, profile, "firefox")).toThrow("Missing");
        expect(() => validateReport({...report, results: []}, suite, profile, "chromium")).toThrow("Missing");
        expect(() => validateReport({...report, results: [...report.results, ...report.results]}, suite, profile, "chromium")).toThrow("duplicate");
        expect(() => validateReport({...report, results: [{id: "query", status: "skipped"}]}, suite, profile, "chromium")).toThrow("did not pass");
        expect(() => validateReport({...report, results: [{id: "query", status: "failed", error: "Wrong tab"}]}, suite, profile, "chromium")).toThrow("Wrong tab");
        expect(() => validateReport({...report, profile: "denied"}, suite, profile, "chromium")).toThrow("Unexpected report profile");
    });
});
