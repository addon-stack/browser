import {expect, test} from "@jest/globals";
import {checkScriptingOutcomes} from "./scripting-assertions.mjs";

const fixture = () => ["promise", "callback"].flatMap(style => [
    ["throw-child", ["main-ok", null]], ["reject-child", ["main-ok", null]],
    ["body", [{}, {}]], ["cycle", [{self: null}, {self: null}]], ["bigint", [null, null]],
    ["void", [null, null]], ["undefined", [null, null]], ["date", [{}, {}]], ["regexp", [{}, {}]],
    ["branded-properties", Array(2).fill({date: {note: "date"}, regexp: {note: "regexp"}, invalidDate: {}})],
].map(([scenario, results]) => ({
    style, scenario, lastError: null,
    results: results.map((result, index) => ({frameId: index, documentId: `document-${index}`, hasResult: true, result})),
})));

test("accepts measured native outcomes only", () => {
    expect(() => checkScriptingOutcomes(fixture())).not.toThrow();
});

test.each(["lastError", "missing", "value", "error-field", "order", "void-missing-field", "void-undefined", "date-value", "regexp-value"])("rejects changed native outcome: %s", kind => {
    const entries = fixture();

    if (kind === "lastError") entries[0].lastError = "unexpected";

    if (kind === "missing") entries.pop();

    if (kind === "value") entries[0].results[1].result = "wrong";

    if (kind === "error-field") entries[0].results[1].error = "new native error field";

    if (kind === "order") entries.reverse();

    if (kind === "void-missing-field") {
        const result = entries.find(entry => entry.scenario === "void").results[0];
        delete result.result;
        result.hasResult = false;
    }

    if (kind === "void-undefined") entries.find(entry => entry.scenario === "void").results[0].result = undefined;

    if (kind === "date-value") entries.find(entry => entry.scenario === "date").results[0].result = "2020-01-02T03:04:05.000Z";

    if (kind === "regexp-value") entries.find(entry => entry.scenario === "regexp").results[0].result = "/probe/gi";

    expect(() => checkScriptingOutcomes(entries)).toThrow();
});
