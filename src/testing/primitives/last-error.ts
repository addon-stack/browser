export interface RuntimeLastErrorController {
    readonly current: chrome.runtime.LastError | undefined;
    runWithLastError<T>(error: unknown, callback: () => T): T;
}

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
