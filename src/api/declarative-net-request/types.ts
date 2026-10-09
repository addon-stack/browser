export type DnrTestMatchOptions = chrome.declarativeNetRequest.TestMatchOptions;

/** Chromium reports rule IDs; Safari reports the matched request URL. */
export interface DnrRulesMatchedDetails {
    rulesMatchedInfo: (chrome.declarativeNetRequest.MatchedRuleInfo | {
        request: {url: string};
        tabId: number;
        timeStamp: number;
    })[];
}
