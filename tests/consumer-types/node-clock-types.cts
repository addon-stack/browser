import {createNodeScriptRuntime, type NodeScriptClock} from "@addon-core/browser/testing/node";

const runtime = createNodeScriptRuntime({clock: true});
const clock: NodeScriptClock | undefined = runtime.clock;
const result: void | undefined = clock?.advance(0);
clock?.runAll({maxTimers: 10});
void result;
runtime.dispose();
