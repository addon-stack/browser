import {expect, test} from "@jest/globals";

import {observeMethods} from "./observations";

test("inventory distinguishes missing namespaces, missing methods and callable methods without invoking them", () => {
    let calls = 0;

    const inherited = {inherited() {
        calls++;
    }};

    const tabs = Object.create(inherited);

    Object.defineProperty(tabs, "query", {value() {
        calls++;
    }, enumerable: false});

    const observations = observeMethods({tabs}, {tabs: {discard: []}, identity: {launchWebAuthFlow: []}});
    expect(observations.find(row => row.namespace === "identity")?.methods[0].state).toBe("namespace-unavailable");
    const methods = observations.find(row => row.namespace === "tabs")!.methods;

    expect(methods.map(row => [row.name, row.state])).toEqual([
        ["discard", "method-unavailable"], ["inherited", "method-present"], ["query", "method-present"],
    ]);

    expect(calls).toBe(0);
});

test("inaccessible namespaces retain their error without claiming browser non-support", () => {
    const api = Object.defineProperty({}, "cookies", {get() {
        throw new Error("Permission withheld");
    }});

    const [row] = observeMethods(api, {cookies: {get: []}});
    expect(row.state).toBe("namespace-unavailable");
    expect(row.accessError).toContain("Permission withheld");
    expect(row.methods[0].state).toBe("namespace-unavailable");
});
