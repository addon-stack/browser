import {existsSync, readdirSync, readFileSync} from "node:fs";
import {dirname, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, test} from "@jest/globals";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sourceDirectory = resolve(root, "src/testing");
const testDirectory = resolve(root, "tests/testing");

const filesIn = directory => readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const file = resolve(directory, entry.name);

    return entry.isDirectory() ? filesIn(file) : [file];
});

const sourceFiles = filesIn(sourceDirectory).filter(file => file.endsWith(".ts"));
const projectPath = file => relative(root, file).split(sep).join("/");
const moduleDirectories = [...new Set(sourceFiles.map(file => dirname(file)))].filter(directory => directory !== sourceDirectory);

const config = file => {
    const input = ts.readConfigFile(resolve(root, file), ts.sys.readFile);
    expect(input.error).toBeUndefined();
    const parsed = ts.parseJsonConfigFileContent(input.config, ts.sys, root);
    expect(parsed.errors).toEqual([]);

    return parsed;
};

const compilerOptions = config("tsconfig.json").options;

const dependencies = sourceFiles.flatMap(file => {
    const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);

    return ast.statements.flatMap(statement => {
        if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier) return [];

        const specifier = statement.moduleSpecifier.text;
        const resolved = ts.resolveModuleName(specifier, file, compilerOptions, ts.sys).resolvedModule;

        if (!resolved) throw new Error(`Unresolved testing dependency: ${projectPath(file)} -> ${specifier}`);

        const clause = ts.isImportDeclaration(statement) ? statement.importClause : statement;
        const bindings = ts.isImportDeclaration(statement) ? clause?.namedBindings : statement.exportClause;

        const typeOnly = clause?.isTypeOnly || (
            bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings)) &&
            bindings.elements.length > 0 && bindings.elements.every(element => element.isTypeOnly) &&
            !(ts.isImportDeclaration(statement) && clause?.name)
        );

        return [{from: projectPath(file), to: projectPath(resolved.resolvedFileName), typeOnly: Boolean(typeOnly)}];
    });
});

describe("test-kit source and test layout", () => {
    test("every implementation directory explicitly selects its public exports", () => {
        const indexes = moduleDirectories.map(directory => resolve(directory, "index.ts"));
        expect(indexes.filter(file => !existsSync(file))).toEqual([]);
        const program = ts.createProgram([...sourceFiles, resolve(root, "src/api.d.ts")], compilerOptions);
        const checker = program.getTypeChecker();

        const exportsOf = file => {
            const source = program.getSourceFile(file);
            expect(source).toBeDefined();
            const symbol = checker.getSymbolAtLocation(source);
            expect(symbol).toBeDefined();

            return checker.getExportsOfModule(symbol);
        };

        const target = symbol => symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
        const publicExports = exportsOf(resolve(sourceDirectory, "index.ts"));

        for (const index of indexes) {
            const source = program.getSourceFile(index);
            expect(source.statements.length).toBeGreaterThan(0);

            for (const statement of source.statements) {
                expect(ts.isExportDeclaration(statement)).toBe(true);
                expect(statement.exportClause && ts.isNamedExports(statement.exportClause)).toBe(true);

                if (statement.moduleSpecifier) {
                    expect(statement.moduleSpecifier.text).toMatch(/^\.\/[^/]+$/);
                    expect(statement.moduleSpecifier.text).not.toBe("./index");
                }
            }

            for (const symbol of exportsOf(index)) {
                const exported = publicExports.find(candidate => candidate.name === symbol.name);
                expect(exported).toBeDefined();
                expect(target(exported)).toBe(target(symbol));
            }
        }
    });

    test("composes public indexes with star exports without expanding the package contract", () => {
        const entry = resolve(sourceDirectory, "index.ts");
        const program = ts.createProgram([entry, resolve(root, "src/api.d.ts")], compilerOptions);
        const checker = program.getTypeChecker();
        const source = program.getSourceFile(entry);

        const expectedModules = [
            ...moduleDirectories.map(directory => `./${relative(sourceDirectory, directory).split(sep).join("/")}`),
            "./fixtures", "./harness", "./types",
        ];

        for (const statement of source.statements) {
            expect(ts.isExportDeclaration(statement)).toBe(true);
            expect(statement.exportClause).toBeUndefined();
            expect(statement.isTypeOnly).toBe(false);
        }

        expect(source.statements.map(statement => statement.moduleSpecifier.text).sort()).toEqual(expectedModules.sort());

        const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(source)).map(symbol => {
            const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

            return {name: symbol.name, hasValue: Boolean(target.flags & ts.SymbolFlags.Value)};
        }).sort((left, right) => left.name.localeCompare(right.name, "en"));

        const baseline = JSON.parse(readFileSync(resolve(root, "tests/tooling/fixtures/testing-public-exports.json"), "utf8"));
        expect(exports).toEqual(baseline);
    });

    test("allows direct implementation imports but never imports a module's own barrel", () => {
        const violations = dependencies.filter(edge => {
            const targetDirectory = edge.to.slice(0, edge.to.lastIndexOf("/"));
            const sourceDirectory = edge.from.slice(0, edge.from.lastIndexOf("/"));

            return sourceDirectory === targetDirectory && edge.to.endsWith("/index.ts");
        });

        expect(violations).toEqual([]);
    });

    test("keeps test suites outside published source and never imports them back", () => {
        expect(sourceFiles.filter(file => /\.(test|spec)\.ts$/.test(file))).toEqual([]);
        expect(dependencies.filter(edge => edge.to.startsWith("tests/") || /\.(test|spec)\.ts$/.test(edge.to))).toEqual([]);
        expect(dependencies.filter(edge => edge.to === "src/testing/index.ts")).toEqual([]);
    });

    test("keeps primitives and shared models independent of API implementations and harness assembly", () => {
        const allowed = {
            primitives: ["primitives/"],
            matching: ["matching/", "primitives/"],
            model: ["model/", "primitives/", "fixtures.ts"],
            coverage: ["coverage/", "primitives/"],
        };

        const violations = dependencies.filter(edge => {
            const layer = edge.from.slice("src/testing/".length).split("/")[0];
            const permitted = allowed[layer];

            return permitted && !permitted.some(prefix => edge.to.startsWith(`src/testing/${prefix}`));
        });

        expect(violations).toEqual([]);
    });

    test("has no runtime import cycles", () => {
        const graph = new Map(sourceFiles.map(file => [projectPath(file), []]));

        for (const edge of dependencies) {
            if (!edge.typeOnly && graph.has(edge.to)) graph.get(edge.from).push(edge.to);
        }

        const visited = new Set();

        const visit = (file, path = []) => {
            if (path.includes(file)) throw new Error(`Test-kit import cycle: ${[...path, file].join(" -> ")}`);

            if (visited.has(file)) return;

            for (const dependency of graph.get(file)) visit(dependency, [...path, file]);

            visited.add(file);
        };

        for (const file of graph.keys()) visit(file);
    });

    test("typechecks every relocated TS test without adding consumer fixtures to the source build", () => {
        const testFiles = filesIn(testDirectory).filter(file => file.endsWith(".ts"));
        const checkedFiles = new Set(config("tsconfig.tests.json").fileNames.map(file => resolve(file)));
        const builtFiles = new Set(config("tsconfig.json").fileNames.map(file => resolve(file)));
        expect(testFiles.length).toBeGreaterThan(0);
        expect(testFiles.filter(file => !checkedFiles.has(file))).toEqual([]);
        expect(testFiles.filter(file => builtFiles.has(file))).toEqual([]);
        expect([...checkedFiles].filter(file => projectPath(file).startsWith("tests/consumer-types/"))).toEqual([]);
        const jestConfig = readFileSync(resolve(root, "jest.config.js"), "utf8");
        expect(jestConfig).toContain('tsconfig: "tsconfig.tests.json"');
        const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
        expect(packageJson.scripts.typecheck).toContain("tsconfig.tests.json");
    });
});
