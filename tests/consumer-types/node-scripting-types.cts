import {executeScript} from "@addon-core/browser";
import {type BrowserScriptExecutor, createBrowserHarness} from "@addon-core/browser/testing";
import {createNodeScriptExecutor, createNodeScriptRuntime, type NodeScriptRuntime} from "@addon-core/browser/testing/node";

const executor: BrowserScriptExecutor = createNodeScriptExecutor({globals: {document: {title: "CJS types"}}});
createBrowserHarness().scripting.setExecutor(executor);
const result: Promise<chrome.scripting.InjectionResult<string>[]> = executeScript<string>({target: {tabId: 7}, func: () => document.title});
void result;
const runtime: NodeScriptRuntime = createNodeScriptRuntime();
runtime.evaluate({documentId: "main"}, {source: "globalThis.ready = true"});
createBrowserHarness().scripting.setExecutor(runtime.executor);
runtime.dispose();
const boundRuntime: NodeScriptRuntime = createNodeScriptRuntime({documents: createBrowserHarness().contexts.documents});
boundRuntime.dispose();
