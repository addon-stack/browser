import {browser} from "./browser";

type Event<T extends (...args: any) => void> = chrome.events.Event<T>;

export const checkLastError = (): void => {
    const error = browser().runtime.lastError;

    if (error) {
        throw new Error(error.message);
    }
};

export function callWithPromise<T>(executor: (callback: (result: T) => void) => any): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let isResolved = false;

        const cb = (result: T) => {
            if (isResolved) {
                return;
            }

            isResolved = true;

            try {
                checkLastError();

                resolve(result);
            } catch (e) {
                reject(e);
            }
        };

        try {
            const result = executor(cb);

            if (result && typeof result.then === "function") {
                result.then(
                    (val: T) => {
                        if (!isResolved) {
                            isResolved = true;
                            resolve(val);
                        }
                    },
                    (err: any) => {
                        if (!isResolved) {
                            isResolved = true;
                            reject(err);
                        }
                    }
                );
            }
        } catch (e) {
            reject(e);
        }
    });
}

interface BrowserMethod<T> {
    callback: (api: typeof chrome, done: (result: T) => void) => void | PromiseLike<T>;
    promise: (api: typeof chrome) => PromiseLike<T>;
}

/**
 * For methods supporting callbacks on Chromium and Promises on browser/Firefox.
 * Firefox MV3 exposes chrome as an alias of browser; its getBrowserInfo capability
 * identifies that Promise interface without an asynchronous detection call.
 * A browser = chrome alias on callback-only Chromium retains callback invocation.
 */
export const callBrowserMethod = <T>(method: BrowserMethod<T>): Promise<T> =>
    callWithPromise<T>(done => {
        const api = browser();

        const usesPromise = api !== globalThis.chrome || typeof api.runtime.getBrowserInfo === "function";

        return usesPromise ? method.promise(api) : method.callback(api, done);
    });

export function safeListener<T extends (...args: any[]) => any>(listener: T): T {
    return ((...args: Parameters<T>): ReturnType<T> | undefined => {
        try {
            const result = listener(...args);

            if (result instanceof Promise) {
                result.catch(err => {
                    console.error("Listener in promise error:", err);
                });
            }

            return result;
        } catch (err) {
            console.error("Listener error:", err);
        }
    }) as T;
}

export function handleListener<T extends (...args: any[]) => void>(target: Event<T>, callback: T): () => void {
    const listener = safeListener(callback);

    target.addListener(listener);

    return () => target.removeListener(listener);
}
