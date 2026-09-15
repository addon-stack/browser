import {type BrowserScriptExecutor, createBrowserHarness} from "@addon-core/browser/testing";
import {createNodeScriptExecutor, type NodeScriptException, type NodeScriptExecutorOptions} from "@addon-core/browser/testing/node";

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
