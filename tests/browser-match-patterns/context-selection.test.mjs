import {expect, test} from "@jest/globals";
import {selectExtensionPageContext} from "./context-selection.mjs";

const expected = {tabId: 8, frameId: 0, documentId: "ready-document", url: "chrome-extension://test/page.html"};
const ready = {contextId: "ready-context", contextType: "TAB", tabId: 8, frameId: 0, documentId: expected.documentId, documentUrl: expected.url};

test("selects the ready document even when an empty-URL context is enumerated first", () => {
    const stale = {...ready, contextId: "stale-context", documentId: "stale-document", documentUrl: ""};
    expect(selectExtensionPageContext([stale, ready], expected)).toBe(ready);
    expect(selectExtensionPageContext([ready, stale], expected)).toBe(ready);
});

test.each([
    {tabId: 9},
    {frameId: 1},
    {documentId: "previous-document"},
    {documentUrl: "chrome-extension://test/other.html"},
    {contextType: "BACKGROUND"},
])("rejects a context with mismatched identity %j instead of falling back", mismatch => {
    const candidate = {...ready, ...mismatch};
    expect(() => selectExtensionPageContext([candidate], expected)).toThrow("found 0");
    expect(() => selectExtensionPageContext([candidate], expected)).toThrow(JSON.stringify({expected, contexts: [candidate]}));
});

test("rejects missing and ambiguous contexts with the complete observed snapshot", () => {
    expect(() => selectExtensionPageContext([], expected)).toThrow("found 0");
    const duplicate = {...ready, contextId: "second-context"};
    expect(() => selectExtensionPageContext([ready, duplicate], expected)).toThrow("found 2");
    expect(() => selectExtensionPageContext([ready, duplicate], expected)).toThrow(JSON.stringify({expected, contexts: [ready, duplicate]}));
});

test.each(["tabId", "frameId", "documentId", "url"])("requires observed ready-page %s rather than weakening the match", field => {
    expect(() => selectExtensionPageContext([ready], {...expected, [field]: undefined})).toThrow("Missing ready-page");
});
