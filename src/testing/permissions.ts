import {type BrowserEventHarness, createBrowserEvent} from "./event";
import {createPermissionsFixture} from "./fixtures";
import {coversOrigin, parseOrigins} from "./match-patterns";
import {type BrowserMethod, createBrowserMethod} from "./method";
import type {PermissionsTestApi, RuntimeLastErrorController} from "./types";

type PermissionEventArgs = Parameters<Parameters<typeof chrome.permissions.onAdded.addListener>[0]>;

export interface PermissionsHarness {
    readonly api: PermissionsTestApi;
    readonly addHostAccessRequest: BrowserMethod<typeof chrome.permissions.addHostAccessRequest, void>;
    readonly contains: BrowserMethod<typeof chrome.permissions.contains, boolean>;
    readonly getAll: BrowserMethod<typeof chrome.permissions.getAll, chrome.permissions.Permissions>;
    readonly remove: BrowserMethod<typeof chrome.permissions.remove, boolean>;
    readonly removeHostAccessRequest: BrowserMethod<typeof chrome.permissions.removeHostAccessRequest, void>;
    readonly request: BrowserMethod<typeof chrome.permissions.request, boolean>;
    readonly onAdded: BrowserEventHarness<PermissionEventArgs>;
    readonly onRemoved: BrowserEventHarness<PermissionEventArgs>;
    readonly value: chrome.permissions.Permissions;
    grant(value: chrome.permissions.Permissions): Promise<void>;
    revoke(value: chrome.permissions.Permissions): Promise<void>;
    set(value: chrome.permissions.Permissions): void;
    reset(): void;
}

const includesAll = <T>(current: Set<T>, expected: readonly T[] | undefined): boolean =>
    (expected ?? []).every(value => current.has(value));

export const createPermissionsHarness = (
    initialValue: chrome.permissions.Permissions | undefined,
    lastError: RuntimeLastErrorController,
    nextSequence?: () => number
): PermissionsHarness => {
    const initial = createPermissionsFixture(initialValue);
    parseOrigins(initial.origins, "permissions initial state");
    let permissions = new Set(initial.permissions ?? []);
    let origins = new Set(initial.origins ?? []);

    const onAdded = createBrowserEvent<PermissionEventArgs>();
    const onRemoved = createBrowserEvent<PermissionEventArgs>();

    const addHostAccessRequest = createBrowserMethod<typeof chrome.permissions.addHostAccessRequest, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "permissions.addHostAccessRequest",
        nextSequence,
    });

    const removeHostAccessRequest = createBrowserMethod<typeof chrome.permissions.removeHostAccessRequest, void>({
        callback: "last",
        callbackArgs: () => [],
        invocation: "dual",
        lastError,
        name: "permissions.removeHostAccessRequest",
        nextSequence,
    });

    const contains = createBrowserMethod<typeof chrome.permissions.contains, boolean>({
        callback: "last",
        implementation: ((value: chrome.permissions.Permissions, callback?: (result: boolean) => void) => {
            const requested = parseOrigins(value.origins, "permissions.contains");
            const granted = parseOrigins([...origins], "permissions.contains");

            const result =
                includesAll(permissions, value.permissions) &&
                requested.every(origin => granted.some(grant => coversOrigin(grant, origin)));

            callback?.(result);

            return result;
        }) as unknown as typeof chrome.permissions.contains,
        invocation: "dual",
        lastError,
        name: "permissions.contains",
        nextSequence,
    });

    const getAll = createBrowserMethod<typeof chrome.permissions.getAll, chrome.permissions.Permissions>({
        callback: "last",
        implementation: ((callback?: (result: chrome.permissions.Permissions) => void) => {
            const result = {origins: [...origins], permissions: [...permissions]};
            callback?.(result);

            return result;
        }) as unknown as typeof chrome.permissions.getAll,
        invocation: "dual",
        lastError,
        name: "permissions.getAll",
        nextSequence,
    });

    const apply = async (
        value: chrome.permissions.Permissions,
        action: "grant" | "revoke"
    ): Promise<chrome.permissions.Permissions> => {
        const changedPermissions: chrome.runtime.ManifestPermission[] = [];
        const changedOrigins: string[] = [];

        const mutate = <T>(set: Set<T>, item: T): boolean => {
            if (action === "revoke") return set.delete(item);

            if (set.has(item)) return false;

            set.add(item);

            return true;
        };

        for (const permission of value.permissions ?? []) {
            if (mutate(permissions, permission)) changedPermissions.push(permission);
        }

        for (const origin of value.origins ?? []) {
            if (mutate(origins, origin)) changedOrigins.push(origin);
        }

        const changed = {origins: changedOrigins, permissions: changedPermissions};

        if (changedPermissions.length || changedOrigins.length) {
            await (action === "grant" ? onAdded : onRemoved).emit(changed);
        }

        return changed;
    };

    const request = createBrowserMethod<typeof chrome.permissions.request, boolean>({
        callback: "last",
        implementation: ((value: chrome.permissions.Permissions, callback?: (result: boolean) => void) => {
            // Validate synchronously before mutation, including when the caller supplied a callback.
            parseOrigins(value.origins, "permissions.request");

            return apply(value, "grant").then(() => {
                callback?.(true);

                return true;
            });
        }) as unknown as typeof chrome.permissions.request,
        invocation: "dual",
        lastError,
        name: "permissions.request",
        nextSequence,
    });

    const remove = createBrowserMethod<typeof chrome.permissions.remove, boolean>({
        callback: "last",
        implementation: ((value: chrome.permissions.Permissions, callback?: (result: boolean) => void) => {
            parseOrigins(value.origins, "permissions.remove");

            return apply(value, "revoke").then(changed => {
                const result = Boolean(changed.permissions?.length || changed.origins?.length);
                callback?.(result);

                return result;
            });
        }) as unknown as typeof chrome.permissions.remove,
        invocation: "dual",
        lastError,
        name: "permissions.remove",
        nextSequence,
    });

    const api = {
        addHostAccessRequest: addHostAccessRequest.api,
        contains: contains.api,
        getAll: getAll.api,
        onAdded: onAdded.api,
        onRemoved: onRemoved.api,
        remove: remove.api,
        removeHostAccessRequest: removeHostAccessRequest.api,
        request: request.api,
    } as unknown as PermissionsTestApi;

    const methods = [addHostAccessRequest, contains, getAll, remove, removeHostAccessRequest, request];

    return {
        api,
        addHostAccessRequest,
        contains,
        getAll,
        remove,
        removeHostAccessRequest,
        request,
        onAdded,
        onRemoved,
        get value() {
            return {origins: [...origins], permissions: [...permissions]};
        },
        async grant(value): Promise<void> {
            parseOrigins(value.origins, "permissions.grant");
            await apply(value, "grant");
        },
        async revoke(value): Promise<void> {
            parseOrigins(value.origins, "permissions.revoke");
            await apply(value, "revoke");
        },
        reset(): void {
            permissions = new Set(initial.permissions ?? []);
            origins = new Set(initial.origins ?? []);

            methods.forEach(method => {
                method.reset();
            });

            onAdded.reset();
            onRemoved.reset();
        },
        set(value): void {
            parseOrigins(value.origins, "permissions.set");
            permissions = new Set(value.permissions ?? []);
            origins = new Set(value.origins ?? []);
        },
    };
};
