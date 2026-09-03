export type BrowserEventListener<TArgs extends readonly unknown[]> = (...args: TArgs) => unknown;

export interface BrowserEventApi<
    TArgs extends readonly unknown[],
    TRegistrationArgs extends readonly unknown[] = readonly unknown[],
> {
    addListener(listener: BrowserEventListener<TArgs>, ...registrationArgs: TRegistrationArgs): void;
    removeListener(listener: BrowserEventListener<TArgs>): void;
    hasListener(listener: BrowserEventListener<TArgs>): boolean;
}

export interface BrowserEventRegistration<
    TArgs extends readonly unknown[],
    TRegistrationArgs extends readonly unknown[] = readonly unknown[],
> {
    readonly listener: BrowserEventListener<TArgs>;
    readonly args: TRegistrationArgs;
}

export interface BrowserEventHarness<
    TArgs extends readonly unknown[],
    TRegistrationArgs extends readonly unknown[] = readonly unknown[],
> {
    readonly api: BrowserEventApi<TArgs, TRegistrationArgs>;
    on(listener: BrowserEventListener<TArgs>, ...registrationArgs: TRegistrationArgs): () => void;
    emit(...args: TArgs): Promise<void>;
    listenerCount(): number;
    registrations(): readonly BrowserEventRegistration<TArgs, TRegistrationArgs>[];
    reset(): void;
}

/**
 * Creates an isolated WebExtension-style event with explicit emission controls.
 */
export function createBrowserEvent<
    TArgs extends readonly unknown[],
    TRegistrationArgs extends readonly unknown[] = readonly unknown[],
>(): BrowserEventHarness<TArgs, TRegistrationArgs> {
    const listeners = new Set<BrowserEventListener<TArgs>>();
    const registrationArgs = new Map<BrowserEventListener<TArgs>, TRegistrationArgs>();

    const api: BrowserEventApi<TArgs, TRegistrationArgs> = {
        addListener(listener, ...args) {
            listeners.add(listener);
            registrationArgs.set(listener, args);
        },
        removeListener(listener) {
            listeners.delete(listener);
            registrationArgs.delete(listener);
        },
        hasListener(listener) {
            return listeners.has(listener);
        },
    };

    return {
        api,
        on(listener, ...args) {
            api.addListener(listener, ...args);

            let subscribed = true;

            return () => {
                if (!subscribed) {
                    return;
                }

                subscribed = false;
                api.removeListener(listener);
            };
        },
        async emit(...args) {
            const pending = [...listeners].map(listener => {
                try {
                    return Promise.resolve(listener(...args));
                } catch (error) {
                    return Promise.reject(error);
                }
            });
            const outcomes = await Promise.allSettled(pending);
            const errors = outcomes
                .filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")
                .map(outcome => outcome.reason);

            if (errors.length === 1) {
                throw errors[0];
            }

            if (errors.length > 1) {
                throw new AggregateError(errors, "Multiple browser event listeners failed");
            }
        },
        listenerCount() {
            return listeners.size;
        },
        registrations() {
            return Object.freeze(
                [...listeners].map(listener =>
                    Object.freeze({
                        listener,
                        args: Object.freeze([
                            ...(registrationArgs.get(listener) ?? []),
                        ]) as unknown as TRegistrationArgs,
                    })
                )
            );
        },
        reset() {
            listeners.clear();
            registrationArgs.clear();
        },
    };
}
