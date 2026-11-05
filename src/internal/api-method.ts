export type ApiMethodName<T> = T extends unknown ? {
    [Name in keyof T]-?: Extract<T[Name], (...args: any[]) => any> extends never ? never : Name;
}[keyof T] : never;

export const requireApiMethod = <T extends object, Name extends keyof T>(
    api: T | undefined,
    namespace: string,
    name: Name
): T[Name] => {
    const method = api?.[name];

    if (typeof method !== "function") {
        throw new Error(`The ${namespace}.${String(name)} API is not supported in this browser`);
    }

    return method.bind(api) as T[Name];
};
