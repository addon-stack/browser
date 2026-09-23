// Literal source is deliberate: coverage instrumentation/build helpers must never leak into the guest realm.
// The injected function is compiled separately in global scope, not inside this driver's lexical closure.
export const GUEST_DRIVER = String.raw`(function (fn, args) {
    "use strict";
    const stringify = JSON.stringify;
    const promiseResolve = Promise.resolve.bind(Promise);
    const ancestors = new Set();
    const convert = (value, depth = 0) => {
        if (depth > 100) throw new Error("Result exceeds supported nesting depth (100)");
        if (value === null || typeof value === "string" || typeof value === "boolean") return value;
        if (typeof value === "number") return Number.isFinite(value) ? value : null;
        if (typeof value !== "object") return null;
        if (ancestors.has(value)) return null;
        const brand = Object.prototype.toString.call(value);
        if (!Array.isArray(value) && !["[object Object]", "[object Date]", "[object RegExp]"].includes(brand)) {
            throw new Error("Unsupported executor result type: " + brand);
        }
        ancestors.add(value);
        try {
            if (Array.isArray(value)) return Array.from(value, item => convert(item, depth + 1));
            return Object.fromEntries(Object.keys(value).map(key => [key, convert(value[key], depth + 1)]));
        } finally { ancestors.delete(value); }
    };
    const success = value => {
        try { return stringify({kind: "result", value: convert(value)}); }
        catch (error) { return stringify({kind: "adapter-error", message: String(error)}); }
    };
    const failure = error => {
        let name = "Error", message = "Uninspectable script exception";
        try {
            name = error && typeof error.name === "string" ? error.name : "Error";
            message = error && typeof error.message === "string" ? error.message : String(error);
        } catch {}
        return stringify({kind: "script-error", name, message});
    };
    let value;
    try { value = fn(...args); }
    catch (error) { return failure(error); }
    try {
        if (value !== null && (typeof value === "object" || typeof value === "function") && typeof value.then === "function") {
            return promiseResolve(value).then(success, failure);
        }
    } catch (error) { return failure(error); }
    return success(value);
})`;
