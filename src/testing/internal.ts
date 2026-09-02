import type {BrowserHarnessCall, RuntimeLastErrorController} from "./types";

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

const errorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;

    return "Unknown browser API error";
};

export const createLastErrorController = (): RuntimeLastErrorController & {reset(): void} => {
    let current: chrome.runtime.LastError | undefined;

    return {
        get current(): chrome.runtime.LastError | undefined {
            return current;
        },
        reset(): void {
            current = undefined;
        },
        runWithLastError<T>(error: unknown, callback: () => T): T {
            const previous = current;
            current = {message: errorMessage(error)};

            try {
                return callback();
            } finally {
                current = previous;
            }
        },
    };
};

export const createCallCollector = () => {
    const sources = new Map<string, () => readonly Omit<BrowserHarnessCall, "api">[]>();

    return {
        add(api: string, calls: () => readonly Omit<BrowserHarnessCall, "api">[]): void {
            sources.set(api, calls);
        },
        all(): BrowserHarnessCall[] {
            return [...sources.entries()]
                .flatMap(([api, getCalls]) => getCalls().map(call => ({...call, api})))
                .sort((left, right) => left.sequence - right.sequence);
        },
    };
};

export const matchesContextFilter = (
    context: chrome.runtime.ExtensionContext,
    filter: chrome.runtime.ContextFilter
): boolean => {
    const checks: Array<[readonly unknown[] | undefined, unknown]> = [
        [filter.contextIds, context.contextId],
        [filter.contextTypes, context.contextType],
        [filter.documentIds, context.documentId],
        [filter.documentOrigins, context.documentOrigin],
        [filter.documentUrls, context.documentUrl],
        [filter.frameIds, context.frameId],
        [filter.tabIds, context.tabId],
        [filter.windowIds, context.windowId],
    ];

    if (typeof filter.incognito === "boolean" && context.incognito !== filter.incognito) return false;

    return checks.every(([expected, actual]) => !expected || expected.includes(actual));
};

export const unsupportedApiError = (name: string): Error => new Error(`Browser test API "${name}" is not configured`);

export const missingEntityError = (kind: "tab" | "window", id: number): Error =>
    new Error(`No ${kind} with id: ${id}.`);
