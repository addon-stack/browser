import {describe, expect, test} from "@jest/globals";
import {checkMessageResponses} from "./messaging-assertions.mjs";

const report = mode => ["promise", "callback"].map(style => {
    const silent = style === "promise" ? {kind: "undefined"} : {kind: "error", message: "The message port closed before a response was received."};

    return {
        style, silent, echo: {kind: "value", value: {label: "receiver"}},
        "no-argument": {kind: "null"}, "undefined-response": {kind: "null"},
        promise: mode === "accept" ? {kind: "value", value: "from-promise"} : {...silent},
        "promise-reject": mode === "accept" ? {kind: "error", message: "probe promise rejection"} : {...silent},
    };
});

describe("browser message-response capability detection", () => {
    test.each(["accept", "ignore"])("recognizes the complete %s contract after JSON transport", mode => {
        expect(checkMessageResponses(JSON.parse(JSON.stringify(report(mode))), "receiver")).toBe(mode);
    });

    test.each([
        ["echo", {kind: "error", message: "Receiving end does not exist"}],
        ["promise", {kind: "error", message: "unknown browser failure"}],
        ["promise", {kind: "null"}],
        ["promise", {kind: "value", value: "wrong response"}],
        ["promise-reject", {kind: "undefined"}],
        ["no-argument", {kind: "undefined"}],
        ["undefined-response", {kind: "undefined"}],
        ["silent", undefined],
    ])("does not classify an invalid %s outcome as missing Promise support", (key, outcome) => {
        const broken = report("accept");
        broken[0][key] = outcome;
        expect(() => checkMessageResponses(JSON.parse(JSON.stringify(broken)), "receiver")).toThrow();
    });

    test("rejects mixed callback/Promise behavior or missing callback measurements", () => {
        expect(() => checkMessageResponses([report("accept")[0], report("ignore")[1]], "receiver")).toThrow();
        expect(() => checkMessageResponses([report("accept")[0]], "receiver")).toThrow();
    });
});
