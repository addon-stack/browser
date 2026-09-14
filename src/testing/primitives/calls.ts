import type {BrowserMethodCallback, BrowserMethodObservedInvocation} from "./method";

export interface BrowserHarnessCall {
    /** Present for calls made through a context-bound messaging facade. */
    contextId?: string;
    api: string;
    args: readonly unknown[];
    callback?: BrowserMethodCallback;
    invocation: BrowserMethodObservedInvocation;
    sequence: number;
}

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
