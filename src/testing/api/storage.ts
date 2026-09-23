import type {BrowserStorageOptions} from "../model";
import {createStorageAreaState, storageAreaNames} from "../model/storage";
import {type BrowserEventHarness, type BrowserMethod, createBrowserEvent, createBrowserMethod} from "../primitives";
import {cloneRecord} from "../primitives/clone";
import type {RuntimeLastErrorController} from "../primitives/last-error";
import type {StorageAreaTestApi, StorageTestApi} from "../types";

type Changes = Record<string, chrome.storage.StorageChange>;

type AreaMethods = {
    get: BrowserMethod<chrome.storage.StorageArea["get"], Record<string, unknown>>;
    getKeys: BrowserMethod<chrome.storage.StorageArea["getKeys"], string[]>;
    getBytesInUse: BrowserMethod<chrome.storage.StorageArea["getBytesInUse"], number>;
    set: BrowserMethod<chrome.storage.StorageArea["set"], void>;
    remove: BrowserMethod<chrome.storage.StorageArea["remove"], void>;
    clear: BrowserMethod<chrome.storage.StorageArea["clear"], void>;
};

export interface StorageAreaHarness extends AreaMethods {
    readonly api: StorageAreaTestApi;
    /** Detached snapshot. Fixture seeds are supplied to createBrowserHarness, including managed policy values. */
    readonly data: Record<string, unknown>;
    readonly onChanged: BrowserEventHarness<[Changes]>;
}

export interface BrowserStorageHarness {
    readonly api: StorageTestApi;
    readonly local: StorageAreaHarness;
    readonly sync: StorageAreaHarness;
    readonly session: StorageAreaHarness;
    readonly managed: StorageAreaHarness;
    readonly onChanged: BrowserEventHarness<[Changes, chrome.storage.AreaName]>;
    /** Wait for listeners started by automatic changes; report their errors separately from successful writes. */
    flushChanges(): Promise<void>;
    reset(): void;
}

export const createStorageHarness = (
    options: BrowserStorageOptions = {},
    lastError: RuntimeLastErrorController,
    nextSequence: () => number
): BrowserStorageHarness => {
    const onChanged = createBrowserEvent<[Changes, chrome.storage.AreaName]>();
    let generation = 0;
    const pending = new Set<Promise<void>>();
    let failures: unknown[] = [];
    const cancelFlushes = new Set<() => void>();
    const resets: (() => void)[] = [];

    const observe = (event: Promise<void>, currentGeneration: number): void => {
        const observed = event.catch(error => {
            if (currentGeneration === generation) failures.push(error);
        }).finally(() => pending.delete(observed));

        if (currentGeneration === generation) pending.add(observed);
    };

    const areas = Object.fromEntries(storageAreaNames.map(area => {
        const limits = options.quotas?.[area] ?? (area === "sync" ? {maxBytes: 102400, maxBytesPerItem: 8192, maxItems: 512} : false);
        const state = createStorageAreaState(area, options[area], limits);
        const changed = createBrowserEvent<[Changes]>();

        const notify = (changes: Changes): void => {
            if (Object.keys(changes).length === 0) return;

            // State is committed before listeners run. A listener cannot turn a successful write into an API error.
            const current = generation;
            observe(changed.emit(cloneRecord(changes)), current);

            if (current === generation) observe(onChanged.emit(cloneRecord(changes), area), current);
        };

        const method = <K extends keyof AreaMethods, R>(
            member: K, operation?: (...args: unknown[]) => R
        ): BrowserMethod<StorageAreaTestApi[K], R> => createBrowserMethod<StorageAreaTestApi[K], R>({
            name: `storage.${area}.${member}`, invocation: "dual", callback: "last", lastError, nextSequence,
            // Browser overloads have generic result types; the adapter operates on serialized unknown records.
            implementation: operation ? ((...raw: unknown[]) => {
                const callback = typeof raw.at(-1) === "function" ? raw.pop() as (...args: unknown[]) => unknown : undefined;
                let result: R;

                try {
                    result = operation(...raw);
                } catch (error) {
                    if (callback) return lastError.runWithLastError(error, () => callback());

                    throw error;
                }

                // Keep consumer callback exceptions outside the API-error boundary (never invoke it twice).
                if (callback) {
                    callback(...(result === undefined ? [] : [result]));

                    return;
                }

                return result;
            }) as unknown as StorageAreaTestApi[K] : undefined,
        });

        const methods: AreaMethods = {
            get: method("get", keys => state.get(keys)),
            getKeys: method("getKeys", () => state.getKeys()),
            // Chrome session accounts for allocated memory, not JSON bytes. Do not pretend to estimate it.
            getBytesInUse: method("getBytesInUse", area === "local" || area === "sync" ? keys => state.getBytesInUse(keys) : undefined),
            set: method("set", items => {
                notify(state.set(items));
            }),
            remove: method("remove", keys => {
                notify(state.remove(keys));
            }),
            clear: method("clear", () => {
                notify(state.clear());
            }),
        };

        const api = Object.fromEntries(Object.entries(methods).map(([name, control]) => [name, control.api])) as Omit<StorageAreaTestApi, "onChanged">;

        resets.push(() => {
            state.reset();
            Object.values(methods).forEach(control => control.reset());
            changed.reset();
        });

        return [area, {...methods, api: {...api, onChanged: changed.api}, onChanged: changed, get data() {
            return state.get(null);
        }}];
    })) as Record<chrome.storage.AreaName, StorageAreaHarness>;

    return {
        ...areas,
        api: {...Object.fromEntries(storageAreaNames.map(area => [area, areas[area].api])) as Record<chrome.storage.AreaName, StorageAreaTestApi>, onChanged: onChanged.api},
        onChanged,
        async flushChanges() {
            let cancel = (): void => undefined;

            const cancelled = new Promise<never>((_, reject) => {
                cancel = () => reject(new Error("storage.flushChanges: harness reset before listeners completed."));
                cancelFlushes.add(cancel);
            });

            try {
                while (pending.size > 0) await Promise.race([Promise.all([...pending]), cancelled]);

                const errors = failures;
                failures = [];

                if (errors.length === 1) throw errors[0];

                if (errors.length > 1) throw new AggregateError(errors, "Storage change listeners failed.");
            } finally {
                cancelFlushes.delete(cancel);
            }
        },
        reset() {
            generation++;

            for (const cancel of cancelFlushes) cancel();

            cancelFlushes.clear();
            pending.clear();
            failures = [];
            onChanged.reset();
            resets.forEach(reset => reset());
        },
    };
};
