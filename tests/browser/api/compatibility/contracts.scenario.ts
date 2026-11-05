import {
    browser, clearAlarm, clearAllAlarm, createAlarm, createAlarmIfNotExists, createTab,
    disableAction, enableAction, getAlarm, getAllAlarm, getBadgeText, getCurrentTab,
    isActionEnabled, isAvailableAction, isAvailableCookies, isAvailableTabs, removeCookie,
    removeTab, setBadgeText,
} from "../../../../dist/index.js";
import {assert, rejects, waitFor} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "native-contracts",
    async run(context) {
        const native = browser();
        const prefix = `compatibility-${Date.now()}`;
        const once = `${prefix}-once`;
        const repeating = `${prefix}-repeating`;
        const conditional = `${prefix}-conditional`;
        const when = Date.now() + 600000;

        try {
            assert(await getAlarm(once) === undefined, "Missing alarms must be undefined");
            await createAlarm(once, {when});
            await createAlarm(repeating, {delayInMinutes: 10, periodInMinutes: 5});
            const alarms = await getAllAlarm();
            assert(alarms.some(alarm => alarm.name === once && alarm.scheduledTime === when), "One-shot alarm was not stored");
            assert(alarms.some(alarm => alarm.name === repeating && alarm.periodInMinutes === 5), "Repeating alarm was not stored");
            assert(await createAlarmIfNotExists(conditional, {when}) === true, "Missing alarm must be created");
            const before = await native.alarms.get(conditional);
            assert(await createAlarmIfNotExists(conditional, {when: when + 600000}) === false, "Existing alarm must be retained");
            assert((await native.alarms.get(conditional))?.scheduledTime === before?.scheduledTime, "Second create changed the scheduled time");
            assert(await clearAlarm(once) === true, "Removing an existing alarm must preserve the native boolean");
            assert(await clearAlarm(once) === false, "Removing a missing alarm must preserve false");
            await rejects(() => createAlarm(`${prefix}-invalid`, {when: "invalid" as unknown as number}), "Invalid native alarm arguments must reject");
            await native.alarms.clearAll();
            await createAlarm(repeating, {delayInMinutes: 10});
            const cleared = await clearAllAlarm();
            assert(cleared === true, "Clearing a nonempty collection must return true");
            assert(await clearAllAlarm() === false, "Clearing an empty collection must return false");
            assert((await native.alarms.getAll()).length === 0, "Alarms were not cleared");
        } finally {
            await native.alarms.clearAll();
        }

        assert(await getCurrentTab() === undefined, "A background context must have no current tab");
        const missingCookie = await removeCookie({url: `${context.base}/`, name: `${prefix}-missing`});
        assert(missingCookie === null || missingCookie.name === `${prefix}-missing`, "Cookie removal must return details or null");
        const tab = await createTab({url: "about:blank", active: false});
        assert(typeof tab.id === "number", "Fixture tab has no ID");

        try {
            await waitFor(() => native.tabs.get(tab.id!), value => value.status === "complete", "initial tab navigation");
            await enableAction(tab.id);
            assert(await isActionEnabled(tab.id) === true, "Enabled action must return true");
            await disableAction(tab.id);
            assert(await isActionEnabled(tab.id) === false, "Disabled action must return false");
            await setBadgeText("test", tab.id);
            assert(await getBadgeText(tab.id) === "test", "Action callback handling lost the badge value");
            assert(isAvailableAction("isEnabled") === (typeof native.action.isEnabled === "function"), "Action method capability differs from native API");
            assert(isAvailableTabs("discard") === (typeof native.tabs.discard === "function"), "Tabs method capability differs from native API");
            assert(isAvailableCookies("getPartitionKey") === (typeof native.cookies.getPartitionKey === "function"), "Cookie method capability differs from native API");
        } finally {
            await removeTab(tab.id);
        }

        await rejects(() => isActionEnabled(tab.id!), "Missing tabs must reject rather than return false");
    },
} satisfies BrowserScenario;
