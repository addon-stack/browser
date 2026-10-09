import {onDnrRuleMatchedDebug} from "@addon-core/browser";

type Expected = (callback: Parameters<typeof chrome.declarativeNetRequest.onRuleMatchedDebug.addListener>[0]) => () => void;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const signature: Equal<typeof onDnrRuleMatchedDebug, Expected> = true;
void signature;

const off: () => void = onDnrRuleMatchedDebug(info => {
    const ruleId: number = info.rule.ruleId;
    const tabId: number = info.request.tabId;
    void ruleId; void tabId;
});

off();

// @ts-expect-error The native event passes an object, not a rule ID string.
onDnrRuleMatchedDebug((id: string) => {
    void id;
});
