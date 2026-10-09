import assert from "node:assert/strict";
import {parseArgs} from "node:util";

export const help = `Usage: npm run test:browser -- --browser chromium|firefox [--api search] [--binary /path/to/browser] [--list]
Build the package first. CHROME_FOR_TESTING_PATH and FIREFOX_PATH are accepted as binary defaults.
Each permission profile runs in a fresh temporary browser profile; the normal npm test does not launch browsers.`;

export function parseOptions(args, env = process.env) {
    const {values} = parseArgs({args, options: {
        browser: {type: "string", default: "chromium"},
        api: {type: "string"},
        binary: {type: "string"},
        list: {type: "boolean", default: false},
        help: {type: "boolean", default: false},
    }});

    assert.ok(["chromium", "firefox"].includes(values.browser), "--browser must be chromium or firefox");

    return {...values, binary: values.binary ?? env[values.browser === "chromium" ? "CHROME_FOR_TESTING_PATH" : "FIREFOX_PATH"]};
}

export function selectSuites(suites, options) {
    const ids = suites.map(suite => suite.id);
    assert.equal(new Set(ids).size, ids.length, "Duplicate browser suite IDs");

    if (options.api) {
        assert.ok(ids.includes(options.api), `Unknown API ${options.api}; available: ${ids.join(", ")}`);
    }

    const selected = suites.filter(suite => (!options.api || suite.id === options.api) && suite.browsers.includes(options.browser));
    assert.ok(selected.length > 0, `No suites support ${options.browser}`);

    for (const suite of selected) {
        assert.ok(suite.profiles.length > 0, `No profiles in ${suite.id}`);
        const profiles = suite.profiles.map(profile => profile.id);
        assert.equal(new Set(profiles).size, profiles.length, `Duplicate profiles in ${suite.id}`);

        for (const profile of suite.profiles) {
            assert.match(`${suite.id}/${profile.id}`, /^[a-z0-9-]+\/[a-z0-9-]+$/);
            const scenarios = scenarioIds(profile, options.browser);
            assert.ok(scenarios.length > 0, `No scenarios in ${suite.id}/${profile.id}`);
            assert.equal(new Set(scenarios).size, scenarios.length, `Duplicate scenarios in ${suite.id}/${profile.id}`);
        }
    }

    return selected;
}

export const scenarioIds = (profile, browser) => profile.scenarios
    .filter(scenario => !scenario.browsers || scenario.browsers.includes(browser)).map(scenario => scenario.id);

export function createManifest(template, profile, browser, base) {
    const manifest = {...template, ...profile.manifest?.[browser]};
    // Permissions belong to the profile, not a growing union of every API's requirements.
    manifest.permissions = [...profile.permissions];
    const origin = new URL(base);

    // Firefox match patterns cannot contain a port, even for a loopback fixture.
    if (browser === "firefox") {
        origin.port = "";
    }

    manifest.host_permissions = [...new Set([...(manifest.host_permissions ?? []), `${origin.origin}/*`])];

    return manifest;
}

export function validateReport(report, suite, profile, browser) {
    assert.equal(report.suite, suite.id, "Unexpected report suite");
    assert.equal(report.profile, profile.id, "Unexpected report profile");
    assert.ok(Array.isArray(report.results), "Missing scenario results");
    assert.deepEqual(report.results.map(item => item.id), scenarioIds(profile, browser), "Missing, duplicate, or unexpected scenarios");

    for (const result of report.results) {
        assert.equal(result.status, "passed", `${suite.id}/${profile.id}/${result.id}: ${result.error ?? "did not pass"}`);
    }
}
