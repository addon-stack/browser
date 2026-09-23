// Optional source-consumer acceptance. The consumer owns bundling; no Addon Bone runtime code enters this package.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../dist/testing/index.js";
import {createNodeScriptRuntime} from "../../dist/testing/node/index.js";

if (!process.argv[2]) throw new Error("Usage: npm run test:relay-consumer -- /path/to/addon-bone (with its development dependencies installed)");

const consumer = resolve(process.argv[2]);
const {buildSync} = createRequire(resolve(consumer, "package.json"))("esbuild");

const bundle = (contents, format) => buildSync({
    stdin: {contents, resolveDir: consumer, sourcefile: "browser-runtime-acceptance.ts", loader: "ts"},
    tsconfig: resolve(consumer, "tsconfig.json"), bundle: true, write: false, format, target: "es2022",
    platform: format === "iife" ? "browser" : "node",
    alias: {"@addon-core/browser": fileURLToPath(new URL("../../dist/index.js", import.meta.url))},
}).outputFiles[0].text;

const bootstrap = bundle(`
    import RelayManager from "./src/relay/RelayManager";
    const manager = RelayManager.getInstance();
    manager.add("counter", {
        value: 0,
        async increment(amount) { return this.value += amount; },
        empty() {},
        fail() { throw new Error("REMOTE_FAILURE"); },
        wait() { return new Promise(resolve => { globalThis.releaseCounter = resolve; }); }
    });
`, "iife");

const adapterSource = bundle('export {default as Adapter} from "./src/relay/adapters/RelayScriptingAdapter";', "esm");
const {Adapter} = await import(`data:text/javascript;base64,${Buffer.from(adapterSource).toString("base64")}`);
const seed = {documentId: "main", tabId: 7, frameId: 0, url: "https://page.test/"};
const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})], documents: [seed]});
const runtime = createNodeScriptRuntime({documents: harness.contexts.documents, clock: true});
const restore = installBrowserGlobals(harness);

const install = () => {
    harness.scripting.setExecutor(runtime.executor);
    runtime.evaluate({documentId: "main"}, {source: bootstrap, filename: "relay-manager.iife.js"});
};

try {
    install();
    const adapter = new Adapter("counter", {tabId: 7});
    assert.equal(await adapter.invoke([1], "increment"), 1);
    assert.equal(await adapter.invoke([1], "increment"), 2);
    assert.equal(await adapter.invoke([], "empty"), undefined);
    await assert.rejects(adapter.invoke([], "fail"), /REMOTE_FAILURE/);
    const late = adapter.invoke([], "wait");
    runtime.evaluate({documentId: "main"}, {source: "releaseCounter(42)"});
    assert.equal(await late, 42);
    const removed = assert.rejects(adapter.invoke([], "wait"), /removed/);
    harness.contexts.documents.remove("main");
    await removed;
    assert.equal(runtime.realmCount, 0);
    assert.equal(runtime.pendingExecutions, 0);
    harness.contexts.documents.create(seed);
    install();
    assert.equal(await adapter.invoke([1], "increment"), 1);
    assert.throws(() => runtime.evaluate({documentId: "main"}, {source: "throw new Error('BROKEN_BOOTSTRAP')"}), /BROKEN_BOOTSTRAP/);
    await assert.rejects(adapter.invoke([1], "increment"), /realm invalidated by/);
    harness.reset();
    await assert.rejects(adapter.invoke([1], "increment"), /no executor configured/);
    install();
    assert.equal(await adapter.invoke([1], "increment"), 1);
    harness.reset();
    harness.scripting.setExecutor(runtime.executor);
    // Locks in current behavior; see https://github.com/addon-stack/addon-bone/issues/109.
    // Both missing-manager paths reject outside the envelope; Chrome-compatible null reaches normalize().
    const missing = assert.rejects(adapter.invoke([1], "increment"), {name: "TypeError", message: /Cannot read properties of null/});
    runtime.clock.advance(2699);
    assert.equal(runtime.pendingExecutions, 1);
    runtime.clock.advance(1);
    await missing;
    assert.equal(runtime.pendingExecutions, 0);
    const noRetry = new Adapter("counter", {tabId: 7, allFrames: true});
    // Locks in current behavior; see https://github.com/addon-stack/addon-bone/issues/109.
    await assert.rejects(noRetry.invoke([1], "increment"), {name: "TypeError", message: /Cannot read properties of null/});

    const registeredLate = adapter.invoke([1], "increment");
    runtime.clock.advance(300);
    runtime.evaluate({documentId: "main"}, {source: bootstrap, filename: "relay-manager.iife.js"});
    runtime.clock.advance(300);
    assert.equal(await registeredLate, 1);
    harness.reset();
    harness.scripting.setExecutor(runtime.executor);
    const removedDuringRetry = assert.rejects(adapter.invoke([1], "increment"), /removed/);
    runtime.clock.advance(300);
    harness.contexts.documents.remove("main");
    await removedDuringRetry;
    runtime.clock.runAll({maxTimers: 1});
    assert.equal(runtime.realmCount, 0);
    console.log("Real RelayManager + RelayScriptingAdapter: lifecycle, virtual retries, late registration and current #109 failures verified.");
} finally {
    runtime.dispose();
    harness.reset();
    restore();
}
