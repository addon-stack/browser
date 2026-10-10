import {
    browser, getDnrAvailableStaticRuleCount, getDnrDisabledRuleIds, getDnrDynamicRules, getDnrEnabledRulesets,
    getDnrRegexSupport, getDnrSessionRules, isAvailableDnr, testDnrMatchOutcome, updateDnrDynamicRules,
    updateDnrEnabledRulesets, updateDnrSessionRules, updateDnrStaticRules,
} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";
import {openFixture, requestCount, requestFromTab} from "./network";

import type {BrowserScenario} from "../../types";

export default {
    id: "rules-and-network",
    async run({base, browser: browserName}) {
        assert(isAvailableDnr(), "DNR must be available with permission");
        const tabId = await openFixture(base);

        const block: chrome.declarativeNetRequest.Rule = {
            id: 1, priority: 1, action: {type: "block"},
            condition: {urlFilter: `|${base}/network/block`, resourceTypes: ["xmlhttprequest"]},
        };

        const redirect: chrome.declarativeNetRequest.Rule = {
            id: 2, priority: 1, action: {type: "redirect", redirect: {url: `${base}/network/destination`}},
            condition: {urlFilter: `|${base}/network/redirect`, resourceTypes: ["xmlhttprequest"]},
        };

        const headers: chrome.declarativeNetRequest.Rule = {
            id: 3, priority: 1,
            action: {type: "modifyHeaders", requestHeaders: [{header: "x-dnr-request", operation: "set", value: "modified"}], responseHeaders: [{header: "x-fixture-response", operation: "set", value: "modified"}]},
            condition: {urlFilter: `|${base}/network/headers`, resourceTypes: ["xmlhttprequest"]},
        };

        try {
            assert((await getDnrDynamicRules()).length === 0 && (await getDnrSessionRules()).length === 0, "Fresh profile has unexpected rules");
            assert((await requestFromTab(tabId, base, "/network/block")).ok, "Baseline request failed");
            const before = await requestCount(base, "/network/block");
            await updateDnrDynamicRules({addRules: [block, redirect]});
            const stored = await getDnrDynamicRules({ruleIds: [block.id]});
            assert(stored.length === 1 && stored[0].id === block.id && stored[0].action.type === "block", "Dynamic rule filter failed");
            assert((await getDnrDynamicRules({ruleIds: [999]})).length === 0, "Missing-ID filter should be empty");
            assert(!(await requestFromTab(tabId, base, "/network/block")).ok, "Dynamic rule did not block the page request");
            assert(await requestCount(base, "/network/block") === before, "Blocked request reached the server");
            const redirected = await requestFromTab(tabId, base, "/network/redirect");
            assert(redirected.ok && redirected.data?.path === "/network/destination", "Redirect did not reach the target");
            assert(await requestCount(base, "/network/redirect") === 0, "Redirected source reached the server");

            const invalid = {...block, id: 0};
            await rejects(() => updateDnrDynamicRules({removeRuleIds: [block.id], addRules: [invalid]}), "Invalid dynamic update must reject");
            assert((await getDnrDynamicRules()).some(rule => rule.id === block.id), "Failed atomic update removed the existing rule");
            await updateDnrSessionRules({addRules: [headers]});
            const session = await getDnrSessionRules({ruleIds: [headers.id]});
            assert(session.length === 1 && session[0].action.type === "modifyHeaders", "Session rule filter failed");
            await rejects(() => updateDnrSessionRules({removeRuleIds: [headers.id], addRules: [invalid]}), "Invalid session update must reject");
            assert((await getDnrSessionRules()).some(rule => rule.id === headers.id), "Failed session update was not atomic");
            const modified = await requestFromTab(tabId, base, "/network/headers");
            assert(modified.ok && modified.data?.headers["x-dnr-request"] === "modified" && modified.responseHeader === "modified", "Request/response headers were not modified");
            await updateDnrSessionRules({removeRuleIds: [headers.id]});
            const restored = await requestFromTab(tabId, base, "/network/headers");
            assert(restored.ok && !restored.data?.headers["x-dnr-request"] && restored.responseHeader === "original", "Removed session rule still modified headers");

            assert((await getDnrEnabledRulesets()).includes("fixture"), "Manifest ruleset not enabled");
            assert(!(await requestFromTab(tabId, base, "/network/static")).ok, "Static rule did not block");
            assert(await requestCount(base, "/network/static") === 0, "Static block reached server");
            await updateDnrStaticRules({rulesetId: "fixture", disableRuleIds: [10]});
            assert((await getDnrDisabledRuleIds({rulesetId: "fixture"})).includes(10), "Static disable state missing");
            assert((await requestFromTab(tabId, base, "/network/static")).ok, "Disabled static rule still blocked");
            await updateDnrStaticRules({rulesetId: "fixture", enableRuleIds: [10]});
            assert((await getDnrDisabledRuleIds({rulesetId: "fixture"})).length === 0, "Static enable state missing");
            await updateDnrEnabledRulesets({disableRulesetIds: ["fixture"]});
            assert((await getDnrEnabledRulesets()).length === 0, "Ruleset was not disabled");
            assert((await requestFromTab(tabId, base, "/network/static")).ok, "Disabled ruleset still blocked");
            await updateDnrEnabledRulesets({enableRulesetIds: ["fixture"]});
            assert(!(await requestFromTab(tabId, base, "/network/static")).ok, "Re-enabled ruleset did not block");
            const available = await getDnrAvailableStaticRuleCount();
            assert(Number.isInteger(available) && available >= 0, "Invalid available rule count");
            assert((await getDnrRegexSupport({regex: "example\\.test"})).isSupported, "Valid regex rejected");
            const unsupported = await getDnrRegexSupport({regex: "["});
            assert(!unsupported.isSupported && unsupported.reason === "syntaxError", "Regex result lost its reason");

            if (browserName === "firefox") {
                await rejects(() => testDnrMatchOutcome({url: `${base}/network/block`, type: "xmlhttprequest"}), "Firefox feedback must require its preference");
            }

            await updateDnrDynamicRules({removeRuleIds: [block.id, redirect.id]});
            assert((await requestFromTab(tabId, base, "/network/block")).ok, "Removed dynamic rule still blocked");
            const direct = await requestFromTab(tabId, base, "/network/redirect");
            assert(direct.ok && direct.data?.path === "/network/redirect", "Removed redirect still applied");
        } finally {
            await updateDnrDynamicRules({removeRuleIds: [1, 2]});
            await updateDnrSessionRules({removeRuleIds: [3]});
            await browser().tabs.remove(tabId);
        }
    },
} satisfies BrowserScenario;
