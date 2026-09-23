import {createNodeScriptRuntime, type NodeScriptClock, type NodeScriptClockOptions, type NodeScriptClockRunOptions} from "@addon-core/browser/testing/node";

const options: NodeScriptClockOptions = {epoch: 0};
const budget: NodeScriptClockRunOptions = {maxTimers: 100};
const runtime = createNodeScriptRuntime({clock: options});
const optional: NodeScriptClock | undefined = runtime.clock;

if (optional) {
    const now: number = optional.now;
    const synchronous: void = optional.advance(300);
    const drained: void = optional.runAll(budget);
    void [now, synchronous, drained];
    // @ts-expect-error Virtual time is controlled by advancement, not assignment.
    optional.now = 100;
}

createNodeScriptRuntime({clock: true}).dispose();
// @ts-expect-error Omit clock to disable it; false is not a clock configuration.
createNodeScriptRuntime({clock: false});
// @ts-expect-error Epoch must be numeric.
createNodeScriptRuntime({clock: {epoch: "now"}});
runtime.dispose();
