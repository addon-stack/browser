import {
    browser, getDnrMatchedRules, onDnrRuleMatchedDebug, setDnrExtensionActionOptions,
    testDnrMatchOutcome, updateDnrDynamicRules,
} from "../../../../dist/index.js";
import {assert, rejects, waitFor} from "../../extension/assert";
import {openFixture, requestFromTab} from "./network";

import type {BrowserScenario} from "../../types";

export default {
    id: "feedback-and-debug-event",
    async run({base, browser: browserName}) {
        const rule: chrome.declarativeNetRequest.Rule = {
            id: 21, priority: 1, action: {type: "block"},
            condition: {urlFilter: `|${base}/network/feedback`, resourceTypes: ["xmlhttprequest"]},
        };

        const request: chrome.declarativeNetRequest.TestMatchRequestDetails = {url: `${base}/network/feedback`, type: "xmlhttprequest"};
        await updateDnrDynamicRules({addRules: [rule]});
        let tabId: number | undefined;
        const cleanup: (() => void)[] = [];

        try {
            const matched = await testDnrMatchOutcome(request);
            assert(matched.matchedRules.some(match => match.ruleId === rule.id), "Hypothetical matching lost the dynamic rule");
            assert((await testDnrMatchOutcome({...request, url: `${base}/network/unmatched`})).matchedRules.length === 0, "Unmatched request returned rules");

            if (browserName === "firefox") {
                const withOptions = await testDnrMatchOutcome(request, {includeOtherExtensions: true});
                assert(withOptions.matchedRules.some(match => match.ruleId === rule.id), "Firefox match options failed");
                // The feedback preference enables testMatchOutcome, not these Chromium-only members.
                assert(typeof browser().declarativeNetRequest.onRuleMatchedDebug === "undefined", "Unexpected Firefox debug event");
                await rejects(() => onDnrRuleMatchedDebug(() => undefined), "Unsupported debug subscription must fail");
                await rejects(() => getDnrMatchedRules(), "Unsupported matched-rule history must reject");
                await rejects(() => setDnrExtensionActionOptions({displayActionCountAsBadgeText: true}), "Unsupported badge options must reject");

                return;
            }

            await rejects(() => testDnrMatchOutcome(request, {includeOtherExtensions: true}), "Chromium must reject Firefox-only options");
            tabId = await openFixture(base);
            await setDnrExtensionActionOptions({displayActionCountAsBadgeText: true});
            const events: chrome.declarativeNetRequest.MatchedRuleInfoDebug[] = [];
            const witness: chrome.declarativeNetRequest.MatchedRuleInfoDebug[] = [];

            const off = onDnrRuleMatchedDebug(info => {
                if (info.rule.ruleId === rule.id) {
                    events.push(info);
                }
            });

            cleanup.push(off, onDnrRuleMatchedDebug(info => {
                if (info.rule.ruleId === rule.id) {
                    witness.push(info);
                }
            }));

            assert(!(await requestFromTab(tabId, base, "/network/feedback?first")).ok, "Feedback rule did not block");
            await waitFor(async () => witness, values => values.length === 1, "first debug event");
            assert(events.length === 1 && events[0].request.tabId === tabId && events[0].request.url === `${base}/network/feedback?first`, "Debug payload lost request metadata");
            const history = await getDnrMatchedRules({tabId});
            assert(history.rulesMatchedInfo.some(info => "rule" in info && info.rule.ruleId === rule.id && info.tabId === tabId), "Matched-rule history lost the real request");
            off(); off();
            assert(!(await requestFromTab(tabId, base, "/network/feedback?second")).ok, "Second debug request did not block");
            await waitFor(async () => witness, values => values.length === 2, "second debug event");
            assert(events.length === 1, "Unsubscribed debug listener was invoked");
            await setDnrExtensionActionOptions({displayActionCountAsBadgeText: false});
        } finally {
            cleanup.forEach(off => off());
            await updateDnrDynamicRules({removeRuleIds: [rule.id]});

            if (tabId !== undefined) {
                await browser().tabs.remove(tabId);
            }
        }
    },
} satisfies BrowserScenario;
