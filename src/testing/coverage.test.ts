import ts from "typescript";
import {
    EXPECTED_ROOT_RUNTIME_EXPORT_COUNT,
    EXPECTED_ROOT_TYPESCRIPT_EXPORT_COUNT,
    PUBLIC_EXPORT_COVERAGE,
    RAW_CAPABILITY_COVERAGE,
    TYPE_ONLY_ROOT_EXPORTS,
} from "./coverage";
import {createBrowserHarness} from "./harness";
import type {RawCapabilityEntry} from "./coverage";
import type {BrowserMethod} from "./method";

type Harness = ReturnType<typeof createBrowserHarness>;
type UnknownRecord = Record<string, unknown>;
type AnyBrowserMethod = BrowserMethod<(...args: never[]) => unknown, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
    value !== null && typeof value === "object" ? (value as UnknownRecord) : undefined;

const memberOf = (value: unknown, member: string): unknown => asRecord(value)?.[member];

const directMethodNamespace = (harness: Harness, namespace: string): unknown => {
    switch (namespace) {
        case "runtime":
            return harness.runtime;
        case "permissions":
            return harness.permissions;
        case "tabs":
            return harness.tabs;
        case "windows":
            return harness.windows;
        case "scripting":
            return harness.scripting;
        default:
            return undefined;
    }
};

const directEventNamespace = (harness: Harness, namespace: string): unknown => {
    switch (namespace) {
        case "runtime":
            return harness.runtime.events;
        case "permissions":
            return harness.permissions;
        case "tabs":
            return harness.tabs.events;
        case "windows":
            return harness.windows.events;
        default:
            return undefined;
    }
};

const configurableNamespaces = (harness: Harness, namespace: string): readonly unknown[] => {
    if (namespace === "browser.sidebarAction") return [harness.sidebar.firefox];
    if (namespace === "opr.sidebarAction") return [harness.sidebar.opera];
    return [memberOf(harness.configurable.chrome, namespace), memberOf(harness.configurable.browser, namespace)];
};

/** Resolves the control that actually owns a raw facade member, independent of its declared coverage. */
const resolveRawCapability = (harness: Harness, entry: RawCapabilityEntry): readonly unknown[] => {
    if (entry.kind === "property") {
        return [harness.chrome, harness.browser].map(facade => {
            const namespace = memberOf(facade, entry.namespace);
            const record = asRecord(namespace);
            return record ? Object.getOwnPropertyDescriptor(record, entry.member) : undefined;
        });
    }

    const directNamespace =
        entry.kind === "method"
            ? directMethodNamespace(harness, entry.namespace)
            : directEventNamespace(harness, entry.namespace);
    const directControl = memberOf(directNamespace, entry.member);
    if (directControl !== undefined) return [directControl];

    return configurableNamespaces(harness, entry.namespace).map(namespace => memberOf(namespace, entry.member));
};

const isBrowserMethodControl = (value: unknown): value is AnyBrowserMethod => {
    const record = asRecord(value);
    return (
        record !== undefined &&
        typeof record.api === "function" &&
        Array.isArray(record.calls) &&
        typeof record.hasDefaultImplementation === "boolean" &&
        typeof record.reset === "function"
    );
};

const isBrowserEventControl = (value: unknown): boolean => {
    const record = asRecord(value);
    const api = asRecord(record?.api);
    return (
        record !== undefined &&
        api !== undefined &&
        typeof api.addListener === "function" &&
        typeof api.removeListener === "function" &&
        typeof api.hasListener === "function" &&
        typeof record.emit === "function" &&
        typeof record.reset === "function"
    );
};

const isPropertyDescriptor = (value: unknown): boolean => {
    const record = asRecord(value);
    return record !== undefined && ("value" in record || "get" in record);
};

const isValidResolution = (entry: RawCapabilityEntry, control: unknown): boolean => {
    if (entry.kind === "method") return isBrowserMethodControl(control);
    if (entry.kind === "event") return isBrowserEventControl(control);
    return isPropertyDescriptor(control);
};

const rootExports = () => {
    const program = ts.createProgram(["src/index.ts"], {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ESNext,
        types: ["chrome"],
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile("src/index.ts");

    if (!source) throw new Error("Unable to load src/index.ts for the public export coverage test");

    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (!moduleSymbol) throw new Error("Unable to resolve the src/index.ts module symbol");

    return {checker, exports: checker.getExportsOfModule(moduleSymbol)};
};

describe("testing coverage matrices", () => {
    test("classifies every root TypeScript export exactly once", () => {
        const {exports} = rootExports();
        const actual = exports.map(symbol => symbol.name).sort();
        const classified = PUBLIC_EXPORT_COVERAGE.map(entry => entry.name).sort();

        expect(actual).toHaveLength(EXPECTED_ROOT_TYPESCRIPT_EXPORT_COUNT);
        expect(classified).toHaveLength(EXPECTED_ROOT_TYPESCRIPT_EXPORT_COUNT);
        expect(new Set(classified).size).toBe(classified.length);
        expect(classified).toEqual(actual);
        expect(PUBLIC_EXPORT_COVERAGE.filter(entry => entry.coverage === "unsupported")).toEqual([]);
    });

    test("keeps the three interfaces type-only and the other 328 exports runtime-visible", () => {
        const {checker, exports} = rootExports();
        const typeOnly = exports
            .filter(symbol => {
                const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
                return !(target.flags & ts.SymbolFlags.Value);
            })
            .map(symbol => symbol.name)
            .sort();

        expect(typeOnly).toEqual([...TYPE_ONLY_ROOT_EXPORTS].sort());
        expect(exports.length - typeOnly.length).toBe(EXPECTED_ROOT_RUNTIME_EXPORT_COUNT);
    });

    test("classifies every raw capability path once", () => {
        const paths = RAW_CAPABILITY_COVERAGE.map(entry => entry.path);

        expect(paths).toHaveLength(305);
        expect(new Set(paths).size).toBe(paths.length);
        expect(
            RAW_CAPABILITY_COVERAGE.filter(
                entry => entry.kind === "method" && (!entry.browserInvocation || !entry.chromeInvocation)
            )
        ).toEqual([]);
    });

    test("resolves all raw capabilities to their actual harness controls", () => {
        const harness = createBrowserHarness();
        const resolutions = RAW_CAPABILITY_COVERAGE.map(entry => ({
            controls: resolveRawCapability(harness, entry),
            entry,
        }));

        expect(resolutions).toHaveLength(305);
        expect(
            resolutions
                .filter(
                    ({controls, entry}) =>
                        controls.length === 0 || controls.some(control => !isValidResolution(entry, control))
                )
                .map(({entry}) => `${entry.kind}:${entry.path}`)
        ).toEqual([]);
    });

    test("keeps stateful coverage equivalent to having a default implementation", () => {
        const harness = createBrowserHarness();
        const mismatches = RAW_CAPABILITY_COVERAGE.filter(entry => entry.kind === "method")
            .flatMap(entry => resolveRawCapability(harness, entry).map(control => ({control, entry})))
            .filter(({control, entry}) => {
                if (!isBrowserMethodControl(control)) return true;
                return (entry.coverage === "stateful") !== control.hasDefaultImplementation;
            })
            .map(({control, entry}) => ({
                coverage: entry.coverage,
                hasDefaultImplementation: isBrowserMethodControl(control)
                    ? control.hasDefaultImplementation
                    : "unresolved",
                path: entry.path,
            }));

        expect(mismatches).toEqual([]);
    });
});
