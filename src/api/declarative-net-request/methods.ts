import {browser} from "../browser";
import {callWithPromise} from "../utils";

import type {DnrRulesMatchedDetails, DnrTestMatchOptions} from "./types";

type Rule = chrome.declarativeNetRequest.Rule;
type GetRulesFilter = chrome.declarativeNetRequest.GetRulesFilter;
type UpdateRuleOptions = chrome.declarativeNetRequest.UpdateRuleOptions;
type UpdateRulesetOptions = chrome.declarativeNetRequest.UpdateRulesetOptions;
type GetDisabledRuleIdsOptions = chrome.declarativeNetRequest.GetDisabledRuleIdsOptions;
type UpdateStaticRulesOptions = chrome.declarativeNetRequest.UpdateStaticRulesOptions;
type MatchedRulesFilter = chrome.declarativeNetRequest.MatchedRulesFilter;
type ExtensionActionOptions = chrome.declarativeNetRequest.ExtensionActionOptions;
type TestMatchRequestDetails = chrome.declarativeNetRequest.TestMatchRequestDetails;
type TestMatchOutcomeResult = chrome.declarativeNetRequest.TestMatchOutcomeResult;
type RegexOptions = chrome.declarativeNetRequest.RegexOptions;
type IsRegexSupportedResult = chrome.declarativeNetRequest.IsRegexSupportedResult;

const dnr = () => browser().declarativeNetRequest;

export const getDnrDynamicRules = (filter?: GetRulesFilter): Promise<Rule[]> =>
    callWithPromise(cb => filter === undefined ? dnr().getDynamicRules(cb) : dnr().getDynamicRules(filter, cb));

export const updateDnrDynamicRules = (options: UpdateRuleOptions): Promise<void> =>
    callWithPromise(cb => dnr().updateDynamicRules(options, cb));

export const getDnrSessionRules = (filter?: GetRulesFilter): Promise<Rule[]> =>
    callWithPromise(cb => filter === undefined ? dnr().getSessionRules(cb) : dnr().getSessionRules(filter, cb));

export const updateDnrSessionRules = (options: UpdateRuleOptions): Promise<void> =>
    callWithPromise(cb => dnr().updateSessionRules(options, cb));

export const getDnrEnabledRulesets = (): Promise<string[]> =>
    callWithPromise(cb => dnr().getEnabledRulesets(cb));

export const updateDnrEnabledRulesets = (options: UpdateRulesetOptions): Promise<void> =>
    callWithPromise(cb => dnr().updateEnabledRulesets(options, cb));

export const getDnrDisabledRuleIds = (options: GetDisabledRuleIdsOptions): Promise<number[]> =>
    callWithPromise(cb => dnr().getDisabledRuleIds(options, cb));

export const updateDnrStaticRules = (options: UpdateStaticRulesOptions): Promise<void> =>
    callWithPromise(cb => dnr().updateStaticRules(options, cb));

export const getDnrAvailableStaticRuleCount = (): Promise<number> =>
    callWithPromise(cb => dnr().getAvailableStaticRuleCount(cb));

export const getDnrMatchedRules = (filter?: MatchedRulesFilter): Promise<DnrRulesMatchedDetails> =>
    callWithPromise(cb => filter === undefined ? dnr().getMatchedRules(cb) : dnr().getMatchedRules(filter, cb));

export const setDnrExtensionActionOptions = (options: ExtensionActionOptions): Promise<void> =>
    callWithPromise(cb => dnr().setExtensionActionOptions(options, cb));

/** The second argument is Firefox-only and uses its native Promise overload. */
export const testDnrMatchOutcome = (
    request: TestMatchRequestDetails,
    options?: DnrTestMatchOptions
): Promise<TestMatchOutcomeResult> =>
    callWithPromise(cb => options === undefined ? dnr().testMatchOutcome(request, cb) : dnr().testMatchOutcome(request, options));

export const getDnrRegexSupport = (options: RegexOptions): Promise<IsRegexSupportedResult> =>
    callWithPromise(cb => dnr().isRegexSupported(options, cb));
