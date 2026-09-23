import {createContext, runInContext} from "node:vm";
import {expect, test} from "@jest/globals";
import {CLOCK_DRIVER} from "../../../../src/testing/node/clock-driver";

test("runOne drains guest microtasks before a second timer can run", () => {
    const context = createContext({}, {microtaskMode: "afterEvaluate"});

    runInContext(`globalThis.driver = (${CLOCK_DRIVER})(0); globalThis.order = [];
        setTimeout(() => { order.push('a'); Promise.resolve().then(() => order.push('after-a')); }, 0);
        setTimeout(() => order.push('b'), 0);
        Promise.resolve().then(() => order.push('c')); void 0;`, context);

    expect(runInContext("JSON.stringify(order)", context)).toBe('["c"]');
    runInContext("driver.runOne(1); void 0;", context);
    expect(runInContext("JSON.stringify(order)", context)).toBe('["c","a","after-a"]');
    runInContext("driver.runOne(2); void 0;", context);
    expect(runInContext("JSON.stringify(order)", context)).toBe('["c","a","after-a","b"]');
});
