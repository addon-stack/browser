export const CLOCK_KEY = "__addon_core_script_clock__";

// Literal guest source, never an instrumented host function. Only JSON metadata leaves the realm.
export const CLOCK_DRIVER = String.raw`(function (initialNow) {
    "use strict";
    const timers = new Map();
    const stringify = JSON.stringify;
    const apply = Reflect.apply;
    const resolve = Promise.resolve.bind(Promise);
    const NativeDate = Date;
    const origin = initialNow;
    let now = initialNow;
    let sequence = 0;
    let revision = 0;
    let asynchronousError;
    const schedule = (repeat, callback, delay = 0, ...args) => {
        if (typeof callback !== "function") throw new TypeError("Guest timers require a function callback (no string handlers)");
        if (typeof delay !== "number" || !Number.isFinite(delay) || delay > 2147483647) {
            throw new TypeError("Guest timer delay must be a finite number at most 2147483647 ms");
        }
        delay = Math.max(0, Math.trunc(delay));
        const id = ++sequence;
        timers.set(id, {id, version: ++revision, callback, args, delay, repeat, due: now + delay});
        return id;
    };
    globalThis.setTimeout = (callback, delay, ...args) => schedule(false, callback, delay, ...args);
    globalThis.setInterval = (callback, delay, ...args) => schedule(true, callback, delay, ...args);
    globalThis.clearTimeout = globalThis.clearInterval = id => { timers.delete(id); };
    class VirtualDate extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    globalThis.Date = new Proxy(VirtualDate, {apply() { return new NativeDate(now).toString(); }});
    globalThis.performance = Object.freeze({timeOrigin: origin, now: () => now - origin});
    return Object.freeze({
        setNow(value) { now = value; },
        snapshot() {
            if (asynchronousError !== undefined) throw new Error(asynchronousError);
            return stringify([...timers.values()].map(({id, version, due, delay, repeat}) => ({id, version, due, delay, repeat})));
        },
        runOne(id) {
            const timer = timers.get(id);
            if (!timer) return;
            if (timer.repeat) {
                timer.due = now + timer.delay;
                timer.version = ++revision;
            } else timers.delete(id);
            const result = apply(timer.callback, globalThis, timer.args);
            // Do not await callback results or pause the clock. Observe detached async errors
            // inside the guest and surface them as infrastructure failures at the next checkpoint.
            resolve(result).catch(error => {
                let detail = "uninspectable exception";
                try { detail = String(error); } catch {}
                asynchronousError = "Guest " + (timer.repeat ? "interval" : "timeout") + " " + timer.delay + " ms rejected: " + detail;
            });
        }
    });
})`;
