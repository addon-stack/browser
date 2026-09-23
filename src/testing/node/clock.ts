import {nodeError} from "./diagnostics";

export interface NodeScriptClockOptions {
    /** Initial Unix timestamp in milliseconds; defaults to 0. */
    readonly epoch?: number;
}

export interface NodeScriptClockRunOptions {
    /** Maximum fired callbacks for this runAll call; defaults to 10,000. */
    readonly maxTimers?: number;
}

export interface NodeScriptClock {
    /** Absolute virtual Unix timestamp in milliseconds. */
    readonly now: number;
    /** Synchronous advancement, including guest microtasks; budget of 10,000 fired callbacks. */
    advance(ms: number): void;
    /** Synchronous draining, including intervals, until empty or the callback budget is reached. */
    runAll(options?: NodeScriptClockRunOptions): void;
}

export interface GuestTimer {
    readonly id: number;
    readonly version: number;
    readonly due: number;
    readonly delay: number;
    readonly repeat: boolean;
}

const MAX_DATE = 8640000000000000;
const DEFAULT_BUDGET = 10000;

export const clockEpoch = (option: true | NodeScriptClockOptions): number => {
    if (option !== true && (!option || typeof option !== "object" || Array.isArray(option) || Object.keys(option).some(key => key !== "epoch"))) {
        throw nodeError("clock must be true or an object with an optional epoch");
    }

    const epoch = option === true || option.epoch === undefined ? 0 : option.epoch;

    if (!Number.isSafeInteger(epoch) || Math.abs(epoch) > MAX_DATE) throw nodeError("clock epoch must be an integer within the JavaScript Date range");

    return epoch;
};

// The host owns the single registration counter. Guest queues retain all callbacks and arguments.
export const createRuntimeClock = <TRealm>(epoch: number, hooks: {
    isLive(realm: TRealm): boolean;
    assertActive(): void;
    describe(realm: TRealm): string;
    runOne(realm: TRealm, timer: GuestTimer): void;
}) => {
    type OrderedTimer = GuestTimer & {order: number};
    const queues = new Map<TRealm, Map<number, OrderedTimer>>();
    let now = epoch;
    let sequence = 0;
    let running = false;

    const next = () => {
        let selected: {realm: TRealm; timer: OrderedTimer} | undefined;

        // Re-read live queues on every iteration: diagnostics may dispose/remove/recreate realms.
        for (const [realm, queue] of queues) {
            if (!hooks.isLive(realm)) continue;

            for (const timer of queue.values()) {
                if (!selected || timer.due < selected.timer.due || (timer.due === selected.timer.due && timer.order < selected.timer.order)) selected = {realm, timer};
            }
        }

        return selected;
    };

    const pump = (end: number | undefined, budget: number): void => {
        hooks.assertActive();

        if (running) throw nodeError("clock advancement is already in progress");

        if (!Number.isSafeInteger(budget) || budget <= 0) throw nodeError("clock maxTimers must be a positive safe integer");

        running = true;
        let count = 0;
        let last = "no timer";

        try {
            while (true) {
                hooks.assertActive();
                const selected = next();

                if (!selected || (end !== undefined && selected.timer.due > end)) break;

                if (count >= budget) throw nodeError(`clock callback budget reached after ${count} timers; last ${last}`);

                const {realm, timer} = selected;

                if (!Number.isSafeInteger(timer.due) || Math.abs(timer.due) > MAX_DATE) throw nodeError(`clock timer deadline exceeds Date range in ${hooks.describe(realm)}`);

                now = timer.due;
                count++;
                last = `${timer.repeat ? "interval" : "timeout"} ${timer.delay} ms in ${hooks.describe(realm)}`;
                hooks.runOne(realm, timer);
            }

            if (end !== undefined) now = end;
        } finally {
            running = false;
        }
    };

    const api: NodeScriptClock = Object.freeze({
        get now() {
            return now;
        },
        advance(ms: number) {
            hooks.assertActive();

            if (!Number.isSafeInteger(ms) || ms < 0 || !Number.isSafeInteger(now + ms) || now + ms > MAX_DATE) {
                throw nodeError("clock advance must be non-negative integer milliseconds within the Date range");
            }

            pump(now + ms, DEFAULT_BUDGET);
        },
        runAll(options: NodeScriptClockRunOptions = {}) {
            if (!options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some(key => key !== "maxTimers")) {
                throw nodeError("clock runAll options must contain only maxTimers");
            }

            pump(undefined, options.maxTimers === undefined ? DEFAULT_BUDGET : options.maxTimers);
        },
    });

    return {
        api,
        update(realm: TRealm, timers: GuestTimer[]) {
            const previous = queues.get(realm);
            const queue = new Map<number, OrderedTimer>();

            // Revision order includes interval rearming and timers registered inside microtasks.
            for (const timer of [...timers].sort((a, b) => a.version - b.version)) {
                const old = previous?.get(timer.id);
                queue.set(timer.id, {...timer, order: old?.version === timer.version ? old.order : ++sequence});
            }

            queues.set(realm, queue);
        },
        forget(realm: TRealm) {
            queues.delete(realm);
        },
    };
};
