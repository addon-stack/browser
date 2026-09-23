import assert from "node:assert/strict";

// Use the ready page's identity, not enumeration order or merely its tab's identity.
export const selectExtensionPageContext = (contexts, expected) => {
    const diagnostic = JSON.stringify({expected, contexts});
    assert.ok(Number.isInteger(expected.tabId) && expected.tabId >= 0, `Missing ready-page tab ID: ${diagnostic}`);
    assert.ok(Number.isInteger(expected.frameId) && expected.frameId >= 0, `Missing ready-page frame ID: ${diagnostic}`);
    assert.ok(typeof expected.documentId === "string" && expected.documentId.length > 0, `Missing ready-page document ID: ${diagnostic}`);
    assert.ok(typeof expected.url === "string" && expected.url.length > 0, `Missing ready-page URL: ${diagnostic}`);

    const matches = contexts.filter(context =>
        context.tabId === expected.tabId
        && context.contextType === "TAB"
        && context.documentUrl === expected.url
        && context.documentId === expected.documentId
        && context.frameId === expected.frameId
    );

    assert.equal(matches.length, 1, `Expected exactly one ready extension-page context; found ${matches.length}: ${diagnostic}`);

    return matches[0];
};
