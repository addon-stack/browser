/** Resolve lazily so importing either package entrypoint does not touch the symbol registry. */
export const getDownloadValidationDelayKey = (): symbol =>
    Symbol.for("@addon-core/browser/download-validation-delay/v1");

export const nativeDownloadValidationDelay = (milliseconds: number): Promise<void> =>
    new Promise<void>(resolve => setTimeout(resolve, milliseconds));

const isPromiseLike = (value: unknown): value is PromiseLike<void> =>
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof Reflect.get(value, "then") === "function";

/** Internal per-facade seam; real browser namespaces retain the native delay. */
export const waitForDownloadValidation = (downloadsApi: object, milliseconds: number): Promise<void> => {
    const key = getDownloadValidationDelayKey();

    if (!Reflect.has(downloadsApi, key)) {
        return nativeDownloadValidationDelay(milliseconds);
    }

    const hook: unknown = Reflect.get(downloadsApi, key);

    if (typeof hook !== "function") {
        throw new Error(
            'Browser method "downloads.download" has an invalid download validation delay hook: expected a function.'
        );
    }

    const result: unknown = Reflect.apply(hook, undefined, [milliseconds]);

    if (!isPromiseLike(result)) {
        throw new Error(
            'Browser method "downloads.download" has an invalid download validation delay hook: expected a Promise or thenable result.'
        );
    }

    return Promise.resolve(result);
};
