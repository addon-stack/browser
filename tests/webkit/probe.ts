import {
    browser, clearAlarm, clearAllAlarm, createAlarm, createAlarmIfNotExists, disableAction,
    enableAction, getAlarm, getAllAlarm, getBadgeText, getCurrentTab, getDnrDynamicRules,
    getRegisteredContentScripts, isActionEnabled, isAvailableAction, isAvailableCookies,
    isAvailableDnr, isAvailableI18n, isAvailablePermissions, isAvailableRuntime, isAvailableTabs,
    isAvailableWebRequest, queryTabs, removeCookie, setBadgeText,
} from "../../dist/index.js";
import {assert, rejects} from "../browser/extension/assert";

const results: {id: string; status: string; error?: string}[] = [];
const native = browser();

async function scenario(id: string, run: () => Promise<void>) {
    try {
        await run();
        results.push({id, status: "passed"});
    } catch (error) {
        results.push({id, status: "failed", error: String(error)});
    }
}

async function main() {
    await scenario("alarms", async () => {
        const when = Date.now() + 600000;

        try {
            assert(await getAlarm("missing") === undefined, "Missing alarm must be undefined");
            await createAlarm("once", {when});
            await createAlarm("repeating", {delayInMinutes: 10, periodInMinutes: 5});
            const alarms = await getAllAlarm();
            // Legacy WebKit derives the fire date after IPC delivery, adding a small dispatch delay.
            assert(alarms.some(alarm => alarm.name === "once" && Math.abs(alarm.scheduledTime - when) < 1000), `One-shot schedule was not stored: ${JSON.stringify({when, alarms})}`);
            assert(alarms.some(alarm => alarm.name === "repeating" && alarm.periodInMinutes === 5), "Repeating schedule was not stored");
            assert(await createAlarmIfNotExists("conditional", {when}) === true, "First call must create");
            const before = await native.alarms.get("conditional");
            assert(await createAlarmIfNotExists("conditional", {when: when + 600000}) === false, "Second call must preserve");
            assert((await native.alarms.get("conditional"))?.scheduledTime === before?.scheduledTime, "Second call changed the schedule");
            const removed = await clearAlarm("once");
            assert(removed === true, "Native removal result was changed");
            assert(await getAlarm("once") === undefined, "Alarm was not removed");
            const missing = await clearAlarm("once");
            assert(missing === false, "Missing removal result was changed");
            const cleared = await clearAllAlarm();
            assert(cleared === true, "Clearing a nonempty collection must return true");
            assert((await native.alarms.getAll()).length === 0, "Alarms were not cleared");
            assert(await clearAllAlarm() === false, "Clearing an empty collection must return false");
            await rejects(() => createAlarm("invalid", {when: "invalid" as unknown as number}), "Invalid alarm arguments must reject");
        } finally {
            await native.alarms.clearAll();
        }
    });

    await scenario("action", async () => {
        const [tab] = await queryTabs();
        assert(typeof tab?.id === "number", "Host tab was not exposed");
        await enableAction(tab.id);
        assert(await isActionEnabled(tab.id) === true, "Enabled action must return true");
        await disableAction(tab.id);
        assert(await isActionEnabled(tab.id) === false, "Disabled action must return false");
        await setBadgeText("test", tab.id);
        assert(await getBadgeText(tab.id) === "test", "Badge callback lost its result");
    });

    await scenario("absent-results", async () => {
        assert(await getCurrentTab() === undefined, "Extension page must have no current tab");
        assert(await removeCookie({url: "https://example.test/", name: "missing"}) === null, "Missing cookie must be null");
    });

    await scenario("capabilities", async () => {
        assert(isAvailableTabs(), "Tabs namespace must be present");
        assert(isAvailableTabs("discard") === (typeof native.tabs.discard === "function"), "Tabs capability differs");
        assert(isAvailableAction("getBadgeTextColor") === (typeof native.action.getBadgeTextColor === "function"), "Action capability differs");
        assert(isAvailableCookies("getPartitionKey") === (typeof native.cookies.getPartitionKey === "function"), "Cookies capability differs");
        assert(isAvailablePermissions("addHostAccessRequest") === (typeof native.permissions.addHostAccessRequest === "function"), "Permissions capability differs");
        assert(isAvailableRuntime("getContexts") === (typeof native.runtime.getContexts === "function"), "Runtime capability differs");
        assert(isAvailableDnr("testMatchOutcome") === (typeof native.declarativeNetRequest.testMatchOutcome === "function"), "DNR capability differs");
        assert(isAvailableI18n("detectLanguage") === (typeof native.i18n.detectLanguage === "function"), "i18n capability differs");
        assert(isAvailableWebRequest("handlerBehaviorChanged") === (typeof native.webRequest?.handlerBehaviorChanged === "function"), "webRequest capability differs");
        assert(Array.isArray(await getDnrDynamicRules()), "DNR callbacks must still return rules");
        assert(Array.isArray(await getRegisteredContentScripts()), "Scripting callbacks must still return scripts");
    });

    await scenario("callback-errors", async () => {
        await rejects(() => isActionEnabled(999999), "Invalid tab must reject");
        await rejects(() => getBadgeText(999999), "Callback lastError must reject");
    });

    const host = globalThis as typeof globalThis & {webkit: {messageHandlers: {result: {postMessage(value: unknown): void}}}};

    host.webkit.messageHandlers.result.postMessage({results});
}

void main();
