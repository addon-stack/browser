import {executeScript} from "@addon-core/browser";
import {
    type BrowserScriptExecution,
    type BrowserScriptExecutor,
    type BrowserScriptSource,
    type BrowserScriptTarget,
    createBrowserHarness,
    type ScriptingHarness,
} from "@addon-core/browser/testing";

const harness = createBrowserHarness();
const scripting: ScriptingHarness = harness.scripting;

const executor: BrowserScriptExecutor = (request: BrowserScriptExecution) => {
    const target: BrowserScriptTarget = request.target;
    const script: BrowserScriptSource = request.script;
    const signal: AbortSignal = request.signal;

    if (script.kind === "function") {
        const source: string = script.source;
        const args: readonly unknown[] = script.args;
        void source;
        void args;
        // @ts-expect-error Executors receive source, not a function retaining the test's closure.
        script.func();
    } else {
        const files: readonly string[] = script.files;
        void files;
    }

    void signal;

    return target.url;
};

scripting.setExecutor(executor);
const targets: readonly BrowserScriptTarget[] = scripting.selectTargets({tabId: 7, documentIds: ["doc"]});
const input = {target: {tabId: 7}, func: (value: number) => value + 1, args: [1] as [number]};
const raw: Promise<chrome.scripting.InjectionResult<number>[]> = harness.browser.scripting.executeScript(input);
const wrapped: Promise<chrome.scripting.InjectionResult<number>[]> = executeScript<number>(input);

harness.chrome.scripting.executeScript(input, results => {
    const value: number | undefined = results[0].result;
    void value;
});

// @ts-expect-error Target selectors are mutually exclusive.
scripting.selectTargets({tabId: 7, allFrames: true, frameIds: [0]});
const pending: number = scripting.pendingExecutions;
scripting.cancelExecutions();
scripting.setExecutor(undefined);
void raw;
void wrapped;
void targets;
void pending;
