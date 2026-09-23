import {GUEST_DRIVER} from "./guest-source";

export const RUNTIME_KEY = "__addon_core_script_runtime__";

// Guest functions, promises and mutable results stay here. Host commands return only void or JSON strings.
export const RUNTIME_DRIVER = `Object.defineProperty(globalThis, ${JSON.stringify(RUNTIME_KEY)}, {
    configurable: false, enumerable: false, writable: false,
    value: (function() {
        const invoke = ${GUEST_DRIVER};
        const resolve = Promise.resolve.bind(Promise);
        const stringify = JSON.stringify;
        const active = new Set();
        let outbox = [];
        return Object.freeze({
            start(id, fn, args) {
                active.add(id);
                const complete = packet => {
                    if (!active.delete(id)) return;
                    outbox.push({id, packet});
                };
                try {
                    resolve(invoke(fn, args)).then(complete, error => complete(stringify({kind: "adapter-error", message: String(error)})));
                } catch (error) { complete(stringify({kind: "adapter-error", message: String(error)})); }
            },
            cancel(id) {
                active.delete(id);
                outbox = outbox.filter(entry => entry.id !== id);
            },
            take() {
                const result = stringify(outbox);
                outbox = [];
                return result;
            }
        });
    })()
}); void 0;`;
