import {expect, test} from "@jest/globals";
import {checkScriptingOutcomes} from "./scripting-assertions.mjs";

const fixture = () => ["promise", "callback"].flatMap(style => [
    ["throw-child", ["main-ok", null]], ["reject-child", ["main-ok", null]],
    ["body", [{}, {}]], ["cycle", [{self: null}, {self: null}]], ["bigint", [null, null]],
].map(([scenario, results]) => ({
    style, scenario, lastError: null,
    results: results.map((result, index) => ({frameId: index, documentId: `document-${index}`, hasResult: true, result})),
})));

test("accepts measured native outcomes only", () => {
    expect(() => checkScriptingOutcomes(fixture())).not.toThrow();
});

test.each(["lastError", "missing", "value", "error-field", "order"])("rejects changed native outcome: %s", kind => {
    const entries = fixture();

    if (kind === "lastError") entries[0].lastError = "unexpected";

    if (kind === "missing") entries.pop();

    if (kind === "value") entries[0].results[1].result = "wrong";

    if (kind === "error-field") entries[0].results[1].error = "new native error field";

    if (kind === "order") entries.reverse();

    expect(() => checkScriptingOutcomes(entries)).toThrow();
});
