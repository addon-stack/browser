import {clearAlarm, clearAllAlarm, createAlarm, getAlarm, getCurrentTab, isActionEnabled, removeCookie} from "@addon-core/browser";

const cleared: Promise<boolean> = clearAlarm("sync");
const clearedAll: Promise<boolean> = clearAllAlarm();
const removed: Promise<chrome.cookies.CookieDetails | null> = removeCookie({url: "https://example.test/", name: "missing"});
const created: Promise<void> = createAlarm("sync", {delayInMinutes: 10});
const alarm: Promise<chrome.alarms.Alarm | undefined> = getAlarm("sync");
const current: Promise<chrome.tabs.Tab | undefined> = getCurrentTab();
const enabled: Promise<boolean> = isActionEnabled(7);
void [cleared, clearedAll, removed, created, alarm, current, enabled];

const alwaysBoolean: Promise<boolean> = clearAlarm("sync");
// @ts-expect-error A missing cookie is represented by null.
const alwaysCookie: Promise<chrome.cookies.CookieDetails> = removeCookie({url: "https://example.test/", name: "missing"});
// @ts-expect-error Native WebKit details objects do not change the public numeric argument.
isActionEnabled({tabId: 7});
void [alwaysBoolean, alwaysCookie];
