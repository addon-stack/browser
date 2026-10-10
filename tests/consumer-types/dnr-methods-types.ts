import {
    type DnrRulesMatchedDetails, type DnrTestMatchOptions, getDnrAvailableStaticRuleCount, getDnrDisabledRuleIds, getDnrDynamicRules,
    getDnrEnabledRulesets, getDnrMatchedRules, getDnrRegexSupport, getDnrSessionRules,
    setDnrExtensionActionOptions, testDnrMatchOutcome, updateDnrDynamicRules, updateDnrEnabledRulesets,
    updateDnrSessionRules, updateDnrStaticRules,
} from "@addon-core/browser";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Dnr = typeof chrome.declarativeNetRequest;
type Update = (options: chrome.declarativeNetRequest.UpdateRuleOptions) => Promise<void>;
type Get = (filter?: chrome.declarativeNetRequest.GetRulesFilter) => Promise<chrome.declarativeNetRequest.Rule[]>;

const signatures: [
    Equal<typeof getDnrDynamicRules, Get>,
    Equal<typeof updateDnrDynamicRules, Update>,
    Equal<typeof getDnrSessionRules, Get>,
    Equal<typeof updateDnrSessionRules, Update>,
    Equal<typeof getDnrEnabledRulesets, () => Promise<string[]>>,
    Equal<typeof updateDnrEnabledRulesets, (options: chrome.declarativeNetRequest.UpdateRulesetOptions) => Promise<void>>,
    Equal<typeof getDnrDisabledRuleIds, (options: chrome.declarativeNetRequest.GetDisabledRuleIdsOptions) => Promise<number[]>>,
    Equal<typeof updateDnrStaticRules, (options: chrome.declarativeNetRequest.UpdateStaticRulesOptions) => Promise<void>>,
    Equal<typeof getDnrAvailableStaticRuleCount, () => Promise<number>>,
    Equal<typeof getDnrMatchedRules, (filter?: chrome.declarativeNetRequest.MatchedRulesFilter) => Promise<DnrRulesMatchedDetails>>,
    Equal<typeof setDnrExtensionActionOptions, (options: chrome.declarativeNetRequest.ExtensionActionOptions) => Promise<void>>,
    Equal<typeof testDnrMatchOutcome, (request: chrome.declarativeNetRequest.TestMatchRequestDetails, options?: DnrTestMatchOptions) => Promise<chrome.declarativeNetRequest.TestMatchOutcomeResult>>,
    Equal<typeof getDnrRegexSupport, (options: chrome.declarativeNetRequest.RegexOptions) => Promise<chrome.declarativeNetRequest.IsRegexSupportedResult>>,
] = [true, true, true, true, true, true, true, true, true, true, true, true, true];

void signatures;

const request: chrome.declarativeNetRequest.TestMatchRequestDetails = {url: "https://example.test/", type: "xmlhttprequest"};
const options: DnrTestMatchOptions = {includeOtherExtensions: true};
const nativePromise: Promise<chrome.declarativeNetRequest.TestMatchOutcomeResult> = chrome.declarativeNetRequest.testMatchOutcome(request);
const firefoxPromise: Promise<chrome.declarativeNetRequest.TestMatchOutcomeResult> = chrome.declarativeNetRequest.testMatchOutcome(request, options);

chrome.declarativeNetRequest.testMatchOutcome(request, result => {
    void result.matchedRules;
});

void nativePromise; void firefoxPromise;
const nativeMethod: Dnr["testMatchOutcome"] = chrome.declarativeNetRequest.testMatchOutcome;
void nativeMethod;

// @ts-expect-error Rule IDs are numeric.
getDnrDynamicRules({ruleIds: ["one"]});
// @ts-expect-error Options cannot be supplied to a zero-argument method.
getDnrEnabledRulesets({});
// @ts-expect-error Native regex result is an object, not a boolean predicate.
const booleanResult: Promise<boolean> = getDnrRegexSupport({regex: "example"});
void booleanResult;
// @ts-expect-error Request type is required.
testDnrMatchOutcome({url: "https://example.test/"});
// @ts-expect-error Firefox options have a boolean field.
testDnrMatchOutcome(request, {includeOtherExtensions: "yes"});
// @ts-expect-error An individual static rule operation requires a ruleset ID.
updateDnrStaticRules({disableRuleIds: [1]});

async function readMatches() {
    const result = await getDnrMatchedRules();

    for (const info of result.rulesMatchedInfo) {
        // @ts-expect-error Safari does not supply rule metadata; narrow the result first.
        void info.rule.ruleId;

        if ("rule" in info) {
            const id: number = info.rule.ruleId;
            void id;
        } else {
            const url: string = info.request.url;
            void url;
        }
    }
}

void readMatches;
