import {getDnrDynamicRules, isAvailableDnr, onDnrRuleMatchedDebug, updateDnrDynamicRules} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "missing-permission",
    async run() {
        assert(!isAvailableDnr(), "DNR should be absent without a DNR permission");
        await rejects(() => getDnrDynamicRules(), "Missing API must not resolve an empty rule list");
        await rejects(() => updateDnrDynamicRules({removeRuleIds: [1]}), "Missing API must not resolve a no-op update");
        await rejects(() => onDnrRuleMatchedDebug(() => undefined), "Missing API must not create a no-op listener");
    },
} satisfies BrowserScenario;
