import {browser} from "./browser";

type Event<T extends (...args: any) => void> = chrome.events.Event<T>;

export const throwRuntimeError = (): void => {
    const error = browser().runtime.lastError;

    if (error) {
        throw new Error(error.message);
    }
};

export function callWithPromise<T>(executor: (callback: (result: T) => void) => any): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let isResolved = false;

        const cb = (result: T) => {
            if (isResolved) return;
            isResolved = true;
            try {
                throwRuntimeError();
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
