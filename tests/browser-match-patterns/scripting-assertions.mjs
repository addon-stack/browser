import assert from "node:assert/strict";

export function checkScriptingOutcomes(entries) {
    const expected = [
        ["throw-child", ["main-ok", null]], ["reject-child", ["main-ok", null]],
        ["body", [{}, {}]], ["cycle", [{self: null}, {self: null}]], ["bigint", [null, null]],
    ];

    assert.equal(entries.length, 10);

    for (const [styleIndex, style] of ["promise", "callback"].entries()) {
        for (const [index, [scenario, values]] of expected.entries()) {
            const entry = entries[styleIndex * expected.length + index];
            assert.equal(entry.style, style);
            assert.equal(entry.scenario, scenario);
            assert.equal(entry.lastError, null, `${style}/${scenario}: unexpected lastError`);
            assert.equal(entry.results.length, 2);
            assert.equal(entry.results[0].frameId, 0);
            assert.ok(entry.results[1].frameId > 0);
            assert.deepEqual(entry.results.map(value => value.result), values, `${style}/${scenario}: native behavior changed`);

            for (const value of entry.results) {
                assert.equal(value.hasResult, true);
                assert.equal(typeof value.documentId, "string");
                assert.deepEqual(Object.keys(value).sort(), ["documentId", "frameId", "hasResult", "result"]);
            }
        }
    }
}
