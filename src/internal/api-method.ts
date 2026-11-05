export type ApiMethodName<T> = T extends unknown ? {
    [Name in keyof T]-?: Extract<T[Name], (...args: any[]) => any> extends never ? never : Name;
}[keyof T] : never;
