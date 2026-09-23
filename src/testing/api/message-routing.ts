import type {BrowserContext, BrowserContextsHarness} from "../model";
import type {BrowserMemoryState} from "../model/browser-state";
import {messageFailure} from "../model/message-channel";
import {cloneRecord} from "../primitives/clone";

const optionsObject = (value: unknown, keys: readonly string[]): value is Record<string, unknown> | null | undefined =>
    value === undefined || value === null || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key)));

export const runtimeMessage = (args: readonly unknown[], extensionId: string): unknown => {
    const fail = (message: string): never => {
        throw messageFailure("runtime.sendMessage", message);
    };

    if (args.length < 1 || args.length > 3) fail("expected message, optional extension ID and options.");

    let message = args[0];
    let target: unknown;
    let options: unknown;

    if (args.length === 2 && optionsObject(args[1], ["includeTlsChannelId"])) options = args[1];
    else if (args.length > 1) [target, message, options] = args;

    if (target !== undefined && target !== extensionId) fail("cross-extension messaging is not supported.");

    if (!optionsObject(options, ["includeTlsChannelId"])) fail("unsupported message options.");

    const tls = options && Reflect.get(options, "includeTlsChannelId");

    if (tls !== undefined && tls !== null && tls !== false) fail("includeTlsChannelId is not supported; omit it or pass false.");

    return message;
};

export const tabMessage = (args: readonly unknown[]): {tabId: number; message: unknown; frameId?: number; documentId?: string} => {
    const fail = (message: string): never => {
        throw messageFailure("tabs.sendMessage", message);
    };

    if (args.length < 2 || args.length > 3 || typeof args[0] !== "number" || !Number.isInteger(args[0]) || args[0] < 0) fail("expected non-negative tabId and message.");

    const options = args[2];

    if (!optionsObject(options, ["frameId", "documentId"])) fail("unsupported message options.");

    const frameId = options == null ? undefined : Reflect.get(options, "frameId");
    const documentId = options == null ? undefined : Reflect.get(options, "documentId");

    if (frameId !== undefined && (typeof frameId !== "number" || !Number.isInteger(frameId) || frameId < 0)) fail("frameId must be a non-negative integer.");

    if (documentId !== undefined && (typeof documentId !== "string" || documentId === "")) fail("documentId must be a non-empty string.");

    return {tabId: args[0] as number, message: args[1], frameId, documentId};
};

export const messageRecipients = (contexts: BrowserContextsHarness, source: BrowserContext, target?: ReturnType<typeof tabMessage>): BrowserContext[] =>
    contexts.list().filter(info => {
        const own = source.info;

        if (info.contextId === own.contextId || info.incognito !== own.incognito) return false;

        if (target) return (info.kind === "contentScript" || info.kind === "extensionPage") && info.tabId === target.tabId &&
            (target.frameId === undefined || info.frameId === target.frameId) &&
            (target.documentId === undefined || info.documentId === target.documentId);

        return info.kind !== "contentScript" && (!own.documentId || own.documentId !== info.documentId);
    }).map(info => contexts.get(info.contextId)!);

export const contextSender = (context: BrowserContext, extensionId: string, state: BrowserMemoryState, tabMessage = false): chrome.runtime.MessageSender => {
    const info = context.info;
    const tab = info.tabId >= 0 ? state.tabs.get(info.tabId) : undefined;
    // Native worker -> tabs.sendMessage includes its extension origin; worker -> runtime.sendMessage omits it.
    const url = new URL(info.url);
    const origin = info.documentOrigin ?? (tabMessage ? `${url.protocol}//${url.host}` : undefined);

    return {
        id: extensionId, url: info.url,
        ...(origin ? {origin} : {}),
        ...(info.documentId ? {documentId: info.documentId, documentLifecycle: "active"} : {}),
        ...(tab ? {tab: cloneRecord(tab), frameId: info.frameId} : {}),
    };
};
