export interface WrapperReference {
    file: string;
    line: number;
    wrapper: string;
}

export type WrapperInventory = Record<string, Record<string, WrapperReference[]>>;
export type MethodState = "namespace-unavailable" | "method-unavailable" | "method-present";

function keys(value: object): string[] {
    const names = new Set<string>();

    for (let current: object | null = value; current && current !== Object.prototype; current = Object.getPrototypeOf(current)) {
        for (const name of Object.getOwnPropertyNames(current)) {
            if (name !== "constructor") {
                names.add(name);
            }
        }
    }

    return [...names].sort();
}

/** Presence observations only: no method is called and no absence is attributed to the browser. */
export function observeMethods(api: object, wrappers: WrapperInventory) {
    const namespaces = new Set(Object.keys(wrappers));

    for (const name of keys(api)) {
        try {
            const value = Reflect.get(api, name);

            if (value && typeof value === "object") {
                namespaces.add(name);
            }
        } catch {
            namespaces.add(name);
        }
    }

    return [...namespaces].sort().map(namespace => {
        let native: object | undefined;
        let accessError: string | undefined;

        try {
            const value = Reflect.get(api, namespace);

            if (value && (typeof value === "object" || typeof value === "function")) {
                native = value;
            }
        } catch (error) {
            accessError = String(error);
        }

        const methods = new Set(Object.keys(wrappers[namespace] ?? {}));

        if (native) {
            for (const name of keys(native)) {
                try {
                    if (typeof Reflect.get(native, name) === "function") {
                        methods.add(name);
                    }
                } catch {
                    // A guarded wrapper reference below still records an inaccessible member.
                }
            }
        }

        return {
            namespace,
            state: native ? "namespace-present" : "namespace-unavailable",
            ...(accessError ? {accessError} : {}),
            methods: [...methods].sort().map(method => {
                let valueType = "undefined";
                let methodError: string | undefined;

                if (native) {
                    try {
                        valueType = typeof Reflect.get(native, method);
                    } catch (error) {
                        methodError = String(error);
                    }
                }

                const state: MethodState = !native ? "namespace-unavailable"
                    : valueType === "function" ? "method-present" : "method-unavailable";

                return {
                    name: method, state, valueType,
                    wrapperReferences: wrappers[namespace]?.[method] ?? [],
                    ...(methodError ? {accessError: methodError} : {}),
                };
            }),
        };
    });
}
