export const cloneArray = <T>(values: readonly T[] | undefined): T[] | undefined =>
    values ? values.map(value => cloneRecord(value)) : undefined;

export const cloneRecord = <T>(value: T): T => {
    if (Array.isArray(value)) {
        return value.map(item => cloneRecord(item)) as T;
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneRecord(item)])
        ) as T;
    }

    return value;
};
