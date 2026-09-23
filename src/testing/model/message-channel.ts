import {cloneRecord} from "../primitives/clone";
import type {BrowserContext} from "./contexts";

export interface BrowserMessageChannelInfo {
    readonly id: number;
    readonly api: "runtime.sendMessage" | "tabs.sendMessage";
    readonly sourceContextId: string;
    readonly recipientContextIds: readonly string[];
}

export interface BrowserIgnoredMessageRejection {
    readonly channelId: number;
    readonly api: BrowserMessageChannelInfo["api"];
    readonly sourceContextId: string;
    readonly recipientContextId: string;
    readonly error: unknown;
}

export const messageFailure = (api: string, message: string): Error => new Error(`${api}: ${message}`);

// Deliberately JSON-based across kit profiles. Do not reuse the Storage enumerable-data codec here.
const serialize = (value: unknown, api: string): string => {
    try {
        const text = JSON.stringify(value === undefined ? null : value);

        if (text === undefined) throw new Error("value is not JSON-serializable");

        return text;
    } catch (cause) {
        throw new Error(`${api}: could not serialize message or response.`, {cause});
    }
};

interface DispatchOptions {
    api: BrowserMessageChannelInfo["api"];
    source: BrowserContext;
    recipients: readonly BrowserContext[];
    sender: chrome.runtime.MessageSender;
    message: unknown;
    promiseListeners: "accept" | "ignore";
    callback: boolean;
}

export const createMessageChannels = () => {
    let sequence = 0;
    let generation = 0;
    let ignoredRejections: BrowserIgnoredMessageRejection[] = [];
    const channels = new Map<number, {info: BrowserMessageChannelInfo; involves(context: BrowserContext): boolean; close(): void}>();

    return {
        get ignoredRejections(): readonly BrowserIgnoredMessageRejection[] {
            return Object.freeze(ignoredRejections.map(entry => Object.freeze({...entry})));
        },
        get pending(): readonly BrowserMessageChannelInfo[] {
            return Object.freeze([...channels.values()].map(({info}) => Object.freeze({
                ...info, recipientContextIds: Object.freeze([...info.recipientContextIds]),
            })));
        },
        close(context?: BrowserContext): void {
            for (const channel of [...channels.values()]) if (!context || channel.involves(context)) channel.close();
        },
        reset(): void {
            generation++;
            ignoredRejections = [];

            for (const channel of [...channels.values()]) channel.close();

            sequence = 0;
        },
        dispatch({api, source, recipients, sender, message, promiseListeners, callback}: DispatchOptions): Promise<unknown> {
            const dispatchGeneration = generation;

            return new Promise((resolve, reject) => {
                const payload = serialize(message, api);

                // A user-defined toJSON may dispose contexts. Do not install orphan channel subscriptions afterward.
                if (source.disposed) throw messageFailure(api, "sender context was disposed.");

                const slots = recipients.filter(context => !context.disposed).flatMap(context => context.onMessage.registrations().map(({listener}) => ({
                    context, listener, active: true,
                })));

                if (slots.length === 0) throw messageFailure(api, "Could not establish connection. Receiving end does not exist.");

                const id = ++sequence;
                let settled = false;
                let dispatched = false;
                let lostReceiver = false;
                const cleanups: Array<() => void> = [];
                const closedError = () => messageFailure(api, "message channel closed before a response was received.");

                const settle = (error: unknown, value?: unknown, failed = false): void => {
                    if (settled) return;

                    settled = true;
                    channels.delete(id);

                    for (const cleanup of cleanups) cleanup();

                    if (failed) reject(error);
                    else resolve(value);
                };

                const fail = (error: unknown): void => settle(error, undefined, true);

                const finish = (): void => {
                    if (!dispatched || settled || slots.some(slot => slot.active)) return;

                    if (lostReceiver) fail(closedError());
                    else if (callback) fail(messageFailure(api, "The message port closed before a response was received."));
                    else settle(undefined, undefined);
                };

                channels.set(id, {
                    info: {id, api, sourceContextId: source.info.contextId, recipientContextIds: [...new Set(slots.map(slot => slot.context.info.contextId))]},
                    involves: context => context === source || slots.some(slot => slot.context === context),
                    close: () => fail(closedError()),
                });

                cleanups.push(source.onDispose(() => fail(closedError())));

                for (const context of new Set(slots.map(slot => slot.context))) {
                    cleanups.push(context.onDispose(() => {
                        for (const slot of slots) if (slot.context === context && slot.active) {
                            slot.active = false;
                            lostReceiver = true;
                        }

                        finish();
                    }));
                }

                for (const slot of slots) {
                    if (slot.context.disposed) {
                        slot.active = false; lostReceiver = true; continue;
                    }

                    const respond = (value?: unknown): void => {
                        if (settled || !slot.active || slot.context.disposed) return;

                        try {
                            settle(undefined, JSON.parse(serialize(value, api)));
                        } catch (error) {
                            fail(error);
                        }
                    };

                    let result: unknown;

                    try {
                        result = slot.listener(JSON.parse(payload), cloneRecord(sender), respond);

                        if (result === true) continue;

                        const then = result !== null && (typeof result === "object" || typeof result === "function")
                            ? Reflect.get(result, "then") : undefined;

                        if (typeof then === "function") {
                            if (promiseListeners === "ignore") {
                                // Observe without keeping this response alive or converting rejection into a reply.
                                // Preserve failures for inspection instead of creating unhandled rejections or logging.
                                Promise.resolve(result).then(undefined, error => {
                                    if (dispatchGeneration === generation) ignoredRejections.push({
                                        channelId: id, api, sourceContextId: source.info.contextId,
                                        recipientContextId: slot.context.info.contextId, error,
                                    });
                                });

                                slot.active = false;

                                continue;
                            }

                            // Observe even rejected promises from a disposed receiver or a losing response.
                            Promise.resolve(result).then(value => {
                                respond(value);
                                slot.active = false;
                                finish();
                            }, error => {
                                if (slot.active && !slot.context.disposed) fail(error);

                                slot.active = false;
                                finish();
                            });

                            continue;
                        }
                    } catch (error) {
                        if (slot.active && !slot.context.disposed) fail(error);
                    }

                    // Only this listener's true/thenable keeps its sendResponse alive.
                    slot.active = false;
                }

                dispatched = true;
                finish();
            });
        },
    };
};
