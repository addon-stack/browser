import {cloneRecord} from "../primitives/clone";
import {storageItemBytes, storageRecord, storageValuesEqual} from "./storage-codec";

export interface StorageQuotaLimits {
    maxBytes?: number;
    maxBytesPerItem?: number;
    maxItems?: number;
}

export interface BrowserStorageOptions {
    local?: Record<string, unknown>;
    sync?: Record<string, unknown>;
    session?: Record<string, unknown>;
    managed?: Record<string, unknown>;
    /** Size/count limits only. Sync defaults to 102400 bytes / 8192 per item / 512 items; other areas have no default quota. */
    quotas?: Partial<Record<chrome.storage.AreaName, StorageQuotaLimits | false>>;
}

export const storageAreaNames = ["local", "sync", "session", "managed"] as const;

export const storageKeys = (keys: unknown, api: string): string[] => {
    if (typeof keys === "string") return [keys];

    if (Array.isArray(keys) && keys.every(key => typeof key === "string")) return [...new Set(keys)];

    throw new Error(`${api}: expected a key string or an array of key strings.`);
};

export const createStorageAreaState = (
    area: chrome.storage.AreaName,
    seed: Record<string, unknown> = {},
    limits: StorageQuotaLimits | false = false
) => {
    const quota = limits ? {...limits} : {};

    for (const [name, limit] of Object.entries(quota)) {
        if (!["maxBytes", "maxBytesPerItem", "maxItems"].includes(name) || !Number.isSafeInteger(limit) || limit < 0) {
            throw new Error(`storage.${area}: invalid quota ${name}.`);
        }
    }

    const initial = storageRecord(seed, `storage.${area} fixtures`);
    let data = new Map(Object.entries(initial));

    const checkQuota = (candidate: Map<string, unknown>, api: string): void => {
        const bytes = [...candidate].map(([key, value]) => storageItemBytes(key, value));

        if (quota.maxItems !== undefined && candidate.size > quota.maxItems) throw new Error(`${api}: MAX_ITEMS quota exceeded.`);

        if (quota.maxBytesPerItem !== undefined && bytes.some(value => value > quota.maxBytesPerItem!)) throw new Error(`${api}: QUOTA_BYTES_PER_ITEM quota exceeded.`);

        if (quota.maxBytes !== undefined && bytes.reduce((total, value) => total + value, 0) > quota.maxBytes) throw new Error(`${api}: QUOTA_BYTES quota exceeded.`);
    };

    checkQuota(data, `storage.${area} fixtures`);

    const commit = (candidate: Map<string, unknown>, api: string): Record<string, chrome.storage.StorageChange> => {
        checkQuota(candidate, api);

        const changes = Object.fromEntries([...new Set([...data.keys(), ...candidate.keys()])].flatMap(key => {
            if (data.has(key) === candidate.has(key) && storageValuesEqual(data.get(key), candidate.get(key))) return [];

            return [[key, {
                ...(data.has(key) ? {oldValue: cloneRecord(data.get(key))} : {}),
                ...(candidate.has(key) ? {newValue: cloneRecord(candidate.get(key))} : {}),
            }]];
        }));

        data = candidate;

        return changes;
    };

    const writable = (api: string): void => {
        if (area === "managed") throw new Error(`${api}: managed storage is read-only.`);
    };

    return {
        get(keys: unknown): Record<string, unknown> {
            const api = `storage.${area}.get`;

            if (keys == null) return cloneRecord(Object.fromEntries(data));

            if (typeof keys === "object" && !Array.isArray(keys)) {
                const defaults = storageRecord(keys, api);

                return cloneRecord(Object.fromEntries(Object.keys(keys).flatMap(key =>
                    data.has(key) ? [[key, data.get(key)]] : Object.hasOwn(defaults, key) ? [[key, defaults[key]]] : []
                )));
            }

            return cloneRecord(Object.fromEntries(storageKeys(keys, api).filter(key => data.has(key)).map(key => [key, data.get(key)])));
        },
        getKeys(): string[] {
            return [...data.keys()];
        },
        getBytesInUse(keys: unknown): number {
            const selected = keys == null ? [...data.keys()] : storageKeys(keys, `storage.${area}.getBytesInUse`);

            return selected.reduce((total, key) => total + (data.has(key) ? storageItemBytes(key, data.get(key)) : 0), 0);
        },
        set(items: unknown) {
            const api = `storage.${area}.set`;
            writable(api);

            return commit(new Map([...data, ...Object.entries(storageRecord(items, api))]), api);
        },
        remove(keys: unknown) {
            const api = `storage.${area}.remove`;
            writable(api);
            const candidate = new Map(data);
            storageKeys(keys, api).forEach(key => candidate.delete(key));

            return commit(candidate, api);
        },
        clear() {
            const api = `storage.${area}.clear`;
            writable(api);

            return commit(new Map(), api);
        },
        reset(): void {
            data = new Map(Object.entries(cloneRecord(initial)));
        },
    };
};
