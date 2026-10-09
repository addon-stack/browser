export function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export async function rejects(invoke: () => unknown, message: string): Promise<void> {
    try {
        await invoke();
    } catch {
        return;
    }

    throw new Error(message);
}

export async function waitFor<T>(read: () => Promise<T>, matches: (value: T) => boolean, label: string): Promise<T> {
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
        const value = await read();

        if (matches(value)) {
            return value;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }

    throw new Error(`Timed out waiting for ${label}`);
}
