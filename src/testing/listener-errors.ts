export type ListenerErrorKind = "sync" | "promise";

export interface ListenerErrorRecord {
    kind: ListenerErrorKind;
    error: unknown;
    args: readonly unknown[];
}

export interface ListenerErrorBuffer {
    readonly entries: ListenerErrorRecord[];
    readonly raw: Array<readonly unknown[]>;
    reset(): void;
}

export interface ListenerErrorCapture extends ListenerErrorBuffer {
    handler: (...args: unknown[]) => void;
    setForward(forward: (...args: unknown[]) => void): void;
}

const prefixes: Record<string, ListenerErrorKind> = {
    "Listener error:": "sync",
    "Listener in promise error:": "promise",
};

export const createListenerErrorCapture = (forward?: (...args: unknown[]) => void): ListenerErrorCapture => {
    let original = forward ?? console.error.bind(console);
    const entries: ListenerErrorRecord[] = [];
    const raw: Array<readonly unknown[]> = [];
    const handler = (...args: unknown[]): void => {
        const [prefix, error, ...details] = args;
        const kind = typeof prefix === "string" ? prefixes[prefix] : undefined;

        if (kind && args.length >= 2) {
            entries.push({args: details, error, kind});
            return;
        }

        raw.push([...args]);
        original(...args);
    };

    return {
        entries,
        raw,
        handler,
        reset(): void {
            entries.length = 0;
            raw.length = 0;
        },
        setForward(value): void {
            if (value !== handler) original = (...args) => Reflect.apply(value, console, args);
        },
    };
};
