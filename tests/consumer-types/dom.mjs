import assert from "node:assert/strict";
import * as production from "@addon-core/browser";
import {getManifest, getUrl} from "@addon-core/browser";
import {createBrowserHarness, installBrowserGlobals, installGlobals} from "@addon-core/browser/testing";
import {JSDOM} from "jsdom";
import checkOffscreen from "./offscreen.cjs";
import checkStorage from "./storage.cjs";

const dom = new JSDOM('<button id="save">Save</button>', {url: "https://example.test/options"});

const restoreEnvironment = installGlobals({
    window: dom.window, document: dom.window.document, location: dom.window.location, navigator: dom.window.navigator,
});

const harness = createBrowserHarness();
const before = [globalThis.window, globalThis.document, globalThis.location, globalThis.navigator];
const restore = installBrowserGlobals(harness, {environment: "preserve"});

try {
    await checkStorage({createBrowserHarness, installBrowserGlobals}, "preserve");
    await checkOffscreen(production, {createBrowserHarness, installBrowserGlobals});
    [globalThis.window, globalThis.document, globalThis.location, globalThis.navigator].forEach((value, index) => assert.equal(value, before[index]));
    assert.equal(globalThis.document.querySelector("button").textContent, "Save");
    assert.equal(globalThis.location.href, "https://example.test/options");
    assert.equal(getManifest().name, "Test Extension");
    const nested = installBrowserGlobals(harness, {environment: "preserve", profile: "firefox"});
    assert.match(getUrl(""), /^moz-extension:/);
    nested();
    assert.match(getUrl(""), /^chrome-extension:/);
} finally {
    restore();
    restoreEnvironment();
    dom.window.close();
}
