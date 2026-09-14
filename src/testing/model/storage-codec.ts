// Deliberately not JSON.stringify/parse: Chrome does not invoke Date.toJSON.
// This codec models the tested enumerable-data subset, not arbitrary JS objects.
export const serializeStorageValue = (input: unknown, api: string): unknown => {
    const ancestors = new Set<object>();

    const visit = (value: unknown, depth: number): unknown => {
        if (depth > 100) throw new Error(`${api}: storage value exceeds the supported nesting depth (100).`);

        if (value === null || typeof value === "string" || typeof value === "boolean") return value;

        if (typeof value === "number") return Number.isFinite(value) ? value === 0 ? 0 : value : null;

        if (typeof value === "bigint") throw new Error(`${api}: BigInt storage values are unsupported.`);

        if (typeof value !== "object") return undefined;

        if (ancestors.has(value)) throw new Error(`${api}: circular storage values are unsupported.`);

        ancestors.add(value);

        try {
            const read = (key: string): unknown => {
                const descriptor = Object.getOwnPropertyDescriptor(value, key);

                if (descriptor && !("value" in descriptor)) throw new Error(`${api}: accessor storage properties are unsupported.`);

                return visit(descriptor?.value, depth + 1);
            };

            if (Array.isArray(value)) return Array.from({length: value.length}, (_, index) => read(String(index)) ?? null);

            return Object.fromEntries(Object.keys(value).flatMap(key => {
                const item = read(key);

                return item === undefined ? [] : [[key, item]];
            }));
        } finally {
            ancestors.delete(value);
        }
    };

    return visit(input, 0);
};

export const storageRecord = (input: unknown, api: string): Record<string, unknown> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error(`${api}: expected a dictionary of storage values.`);
    }

    return serializeStorageValue(input, api) as Record<string, unknown>;
};

export const storageValuesEqual = (left: unknown, right: unknown): boolean => {
    if (left === right) return true;

    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;

    if (Array.isArray(left) !== Array.isArray(right)) return false;

    const keys = Object.keys(left);

    return keys.length === Object.keys(right).length && keys.every(key =>
        Object.hasOwn(right, key) && storageValuesEqual(Reflect.get(left, key), Reflect.get(right, key))
    );
};

// Avoid a dependency on Buffer or host TextEncoder (not installed by all jsdom environments).
const utf8Length = (text: string): number => {
    let length = 0;

    for (const character of text) {
        const code = character.codePointAt(0) as number;
        length += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
    }

    return length;
};

export const storageItemBytes = (key: string, value: unknown): number =>
    utf8Length(key) + utf8Length(JSON.stringify(value));
