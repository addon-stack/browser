import {fileURLToPath} from "node:url";

import {expect, test} from "@jest/globals";

import {collectWrapperMethods} from "./wrappers.mjs";

test("discovers direct calls, guarded calls, union namespaces and function references from production sources", () => {
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const methods = collectWrapperMethods(root);
    expect(methods.alarms.create.some(ref => ref.wrapper === "createAlarm")).toBe(true);
    expect(methods.alarms.clear.some(ref => ref.wrapper === "clearAlarm")).toBe(true);
    expect(methods.action.isEnabled.some(ref => ref.wrapper === "isActionEnabled")).toBe(true);
    expect(methods.browserAction.isEnabled.some(ref => ref.wrapper === "isActionEnabled")).toBe(true);
    expect(methods.cookies.getPartitionKey.some(ref => ref.wrapper === "getCookiePartitionKey")).toBe(true);
    expect(methods.i18n.detectLanguage).toHaveLength(1);
    expect(Object.keys(methods).length).toBeGreaterThan(25);
});
