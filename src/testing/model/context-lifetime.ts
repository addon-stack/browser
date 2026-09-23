import {type BrowserEventHarness, createBrowserEvent} from "../primitives";

export interface BrowserContextLifetime {
    readonly disposed: boolean;
    readonly signal: AbortSignal;
    /** Registers synchronous cleanup. The returned function unregisters the cleanup. */
    onDispose(cleanup: () => void): () => void;
    /** Rejects the observed operation when this context is removed or reset. */
    track<T>(operation: PromiseLike<T>): Promise<T>;
}

export const createContextLifetime = (contextId: string) => {
    const controller = new AbortController();
    const cleanups = new Set<() => void>();
    const pending = new Set<(reason: Error) => void>();
    let disposed = false;

    const closedError = (): Error => new Error(`Browser test context "${contextId}" was disposed`);

    const assertActive = (): void => {
        if (disposed) throw closedError();
    };

    const lifetime: BrowserContextLifetime = {
        get disposed() {
            return disposed;
        },
        signal: controller.signal,
        onDispose(cleanup) {
            assertActive();
            cleanups.add(cleanup);

            return () => {
                cleanups.delete(cleanup);
            };
        },
        track<T>(operation: PromiseLike<T>): Promise<T> {
            // Always observe the original promise, including late rejections after disposal.
            const source = Promise.resolve(operation);

            return new Promise<T>((resolve, reject) => {
                let settled = false;

                const cancel = (reason: Error): void => {
                    if (settled) return;

                    settled = true;
                    pending.delete(cancel);
                    reject(reason);
                };

                source.then(value => {
                    if (settled) return;

                    settled = true;
                    pending.delete(cancel);
                    resolve(value);
                }, cancel);

                if (disposed) cancel(closedError());
                else pending.add(cancel);
            });
        },
    };

    const event = <TArgs extends readonly unknown[]>(): BrowserEventHarness<TArgs> => {
        const source = createBrowserEvent<TArgs>();
        cleanups.add(() => source.reset());

        return {
            ...source,
            api: {
                ...source.api,
                addListener(listener, ...args) {
                    assertActive();
                    source.api.addListener(listener, ...args);
                },
            },
            on(listener, ...args) {
                assertActive();

                return source.on(listener, ...args);
            },
            emit(...args) {
                if (disposed) return Promise.reject(closedError());

                return lifetime.track(source.emit(...args));
            },
        };
    };

    return {
        lifetime,
        event,
        dispose(): void {
            if (disposed) return;

            disposed = true;
            const reason = closedError();

            for (const cancel of [...pending]) cancel(reason);

            controller.abort(reason);
            const errors: unknown[] = [];

            for (const cleanup of [...cleanups]) {
                try {
                    cleanup();
                } catch (error) {
                    errors.push(error);
                }
            }

            cleanups.clear();

            if (errors.length > 0) throw new AggregateError(errors, `Cleanup failed for browser test context "${contextId}"`);
        },
    };
};
