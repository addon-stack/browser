import {type BrowserScriptExecutor, createBrowserHarness} from "@addon-core/browser/testing";
import {createNodeScriptExecutor, createNodeScriptRuntime, type NodeScriptBootstrap, type NodeScriptException, type NodeScriptExecutorOptions, type NodeScriptRealm, type NodeScriptRuntime, type NodeScriptRuntimeOptions} from "@addon-core/browser/testing/node";

const options: NodeScriptExecutorOptions = {
    globals: target => ({document: {title: target.documentId}}),
    timeout: 100,
    onScriptError: (exception: NodeScriptException) => {
        const id: string = exception.target.documentId;
        const message: string = exception.message;
        void id;
        void message;
    },
};

const executor: BrowserScriptExecutor = createNodeScriptExecutor(options);
createBrowserHarness().scripting.setExecutor(executor);

// @ts-expect-error No evaluator is exported from the portable entrypoint.
import {createNodeScriptExecutor as portableExecutor} from "@addon-core/browser/testing";

void portableExecutor;

const runtimeOptions: NodeScriptRuntimeOptions = {timeout: 100, onScriptError: options.onScriptError};
const runtime: NodeScriptRuntime = createNodeScriptRuntime(runtimeOptions);
const realm: NodeScriptRealm = {documentId: "main", world: "ISOLATED"};
const bootstrap: NodeScriptBootstrap = {source: "globalThis.ready = true", filename: "bootstrap.js"};
runtime.evaluate(realm, bootstrap);
createBrowserHarness().scripting.setExecutor(runtime.executor);
const counts: number[] = [runtime.realmCount, runtime.pendingExecutions];
void counts;
runtime.dispose();

const boundHarness = createBrowserHarness({documents: [{documentId: "doc", url: "https://page.test/"}]});
const boundRuntime: NodeScriptRuntime = createNodeScriptRuntime({documents: boundHarness.contexts.documents});
boundRuntime.evaluate({documentId: "doc"}, {source: "globalThis.ready = true"});
boundHarness.reset();
boundRuntime.dispose();

// @ts-expect-error The persistent runtime is Node-only too.
import {createNodeScriptRuntime as portableRuntime} from "@addon-core/browser/testing";

void portableRuntime;
