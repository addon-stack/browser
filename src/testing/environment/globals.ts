import type {BrowserHarness} from "../harness";
import {createContextGlobals, profileGlobals, sidebarDefaultForProfile} from "./profiles";
import type {InstallBrowserGlobalsOptions, TestGlobalValues} from "./types";

interface DescriptorChange {
    key: PropertyKey;
    descriptor: PropertyDescriptor | undefined;
    target: object;
}

const installations: symbol[] = [];

const applyDescriptor = (target: object, key: PropertyKey, value: unknown): void => {
    if (typeof value === "undefined") {
        if (!Reflect.deleteProperty(target, key)) {
            throw new Error(`Unable to remove global ${String(key)}`);
        }

        return;
    }

    if (
        !Reflect.defineProperty(target, key, {
            configurable: true,
            enumerable: true,
            value,
            writable: true,
        })
    ) {
        throw new Error(`Unable to install global ${String(key)}`);
    }
};

const restoreChanges = (changes: readonly DescriptorChange[]): void => {
    const failures: Error[] = [];

    for (const {descriptor, key, target} of [...changes].reverse()) {
        try {
            const restored = descriptor
                ? Reflect.defineProperty(target, key, descriptor)
                : Reflect.deleteProperty(target, key);

            if (!restored) failures.push(new Error(`Unable to restore global ${String(key)}`));
        } catch (cause) {
            failures.push(new Error(`Unable to restore global ${String(key)}`, {cause}));
        }
    }

    if (failures.length > 0) throw new AggregateError(failures, "Unable to restore browser globals");
};

const installGlobalValues = (values: TestGlobalValues, restoreProfile?: () => void): (() => void) => {
    const changes: DescriptorChange[] = [];

    try {
        for (const key of ["chrome", "browser", "opr", "safari", "navigator", "window", "document", "location"] as const) {
            if (!Object.hasOwn(values, key)) continue;

            const descriptor = Reflect.getOwnPropertyDescriptor(globalThis, key);
            applyDescriptor(globalThis, key, values[key]);
            changes.push({descriptor, key, target: globalThis});
        }

        if (Object.hasOwn(values, "consoleError")) {
            const change = {
                descriptor: Reflect.getOwnPropertyDescriptor(console, "error"),
                key: "error",
                target: console,
            };

            applyDescriptor(console, "error", values.consoleError);
            changes.push(change);
        }
    } catch (error) {
        try {
            restoreChanges(changes);
        } catch (restoreError) {
            throw new AggregateError([error, restoreError], "Browser globals installation and rollback failed");
        }

        throw error;
    }

    let finished = false;
    const installation = Symbol("browser globals installation");
    installations.push(installation);

    return (): void => {
        if (finished) return;

        if (installations.at(-1) !== installation) {
            throw new Error("Restore browser globals in reverse installation order");
        }

        // A started cleanup is terminal, even on failure. It must not strand outer
        // installations or overwrite their state when this handle is called again.
        finished = true;
        const failures: unknown[] = [];

        try {
            for (const cleanup of [() => restoreChanges(changes), restoreProfile]) {
                try {
                    cleanup?.();
                } catch (error) {
                    failures.push(error);
                }
            }
        } finally {
            installations.pop();
        }

        if (failures.length === 1) throw failures[0];

        if (failures.length > 1) throw new AggregateError(failures, "Browser globals and profile restoration failed");
    };
};

/** Installs only own properties present in `values` and restores their exact descriptors. */
export const installGlobals = (values: TestGlobalValues): (() => void) => installGlobalValues(values);

/** Installs a coherent browser profile. Importing this module never mutates globals by itself. */
export const installBrowserGlobals = (
    harness: BrowserHarness,
    options: InstallBrowserGlobalsOptions = {}
): (() => void) => {
    const profile = options.profile ?? "chrome";
    const context = options.context ?? "extensionPage";
    const preserve = options.environment === "preserve";

    if (preserve && options.context !== undefined) {
        throw new Error('environment: "preserve" cannot be combined with a simulated context');
    }

    if (preserve) {
        for (const key of ["window", "document", "location", "navigator"] as const) {
            if (options.globals && Object.hasOwn(options.globals, key)) {
                throw new Error(`environment: "preserve" cannot override ${key}`);
            }
        }
    }

    const restoreProfile = harness.captureProfileState();

    try {
        harness.setActiveProfile(profile);
        harness.setProfileSidebarFlavor(sidebarDefaultForProfile(profile));

        if (profile !== "custom") {
            harness.setProfileCapability("runtime.getBrowserInfo", profile === "firefox");
        }

        const values: TestGlobalValues = profile === "custom" ? {} : profileGlobals(harness, profile);

        if (preserve) delete values.navigator;
        else Object.assign(values, createContextGlobals(context));

        Object.assign(values, options.globals);

        if (options.captureListenerErrors) {
            values.consoleError = harness.getListenerErrorHandler(console.error);
        }

        return installGlobalValues(values, restoreProfile);
    } catch (error) {
        try {
            restoreProfile();
        } catch (restoreError) {
            throw new AggregateError([error, restoreError], "Browser globals installation and profile rollback failed");
        }

        throw error;
    }
};
