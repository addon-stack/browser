import assert from "node:assert/strict";
import {existsSync, readdirSync, readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {assertPortableTestingGraph} from "./testing-boundary.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceEntry = resolve(projectRoot, "src/index.ts");
const declarationEntry = resolve(projectRoot, "dist/index.d.ts");
const testingSourceDirectory = resolve(projectRoot, "src/testing");

const getModuleExports = (file, compilerOptions) => {
    const program = ts.createProgram([file], compilerOptions);
    const sourceFile = program.getSourceFile(file);

    assert.ok(sourceFile, `Unable to load ${file}`);

    const checker = program.getTypeChecker();
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

    assert.ok(moduleSymbol, `Unable to resolve module symbol for ${file}`);

    return checker.getExportsOfModule(moduleSymbol).map(symbol => {
        const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

        return {
            hasValue: (resolved.flags & ts.SymbolFlags.Value) !== 0,
            name: symbol.getName(),
        };
    });
};

const sortNames = values => values.map(value => value.name).sort();

const sourceExports = getModuleExports(sourceEntry, {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    types: ["chrome"],
});

const declarationExports = getModuleExports(declarationEntry, {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    skipLibCheck: true,
    target: ts.ScriptTarget.ESNext,
    types: ["chrome"],
});

assert.equal(sourceExports.length, 333, "The source public-export baseline changed; update the coverage matrix first");

assert.equal(
    sourceExports.filter(value => value.hasValue).length,
    330,
    "The source runtime-export baseline changed; update the coverage matrix first"
);

assert.deepEqual(sortNames(declarationExports), sortNames(sourceExports), "Source and declaration exports differ");

const expectedTypeOnly = ["BrowserGuess", "LaunchWebAuthFlowDetails", "WindowEventFilter"];

assert.deepEqual(
    sourceExports
        .filter(value => !value.hasValue)
        .map(value => value.name)
        .sort(),
    expectedTypeOnly.slice().sort(),
    "The type-only public-export allowlist changed"
);

const esm = await import(`${new URL("../dist/index.js", import.meta.url).href}?verify=${Date.now()}`);
const require = createRequire(import.meta.url);
const cjs = require(resolve(projectRoot, "dist/index.cjs"));

const sourceValueNames = sourceExports
    .filter(value => value.hasValue)
    .map(value => value.name)
    .sort();

assert.deepEqual(Object.keys(esm).sort(), sourceValueNames, "ESM runtime exports differ from source value exports");
assert.deepEqual(Object.keys(cjs).sort(), sourceValueNames, "CJS runtime exports differ from source value exports");

const sourceIndex = readFileSync(sourceEntry, "utf8");
const esmIndex = readFileSync(resolve(projectRoot, "dist/index.js"), "utf8");
const cjsIndex = readFileSync(resolve(projectRoot, "dist/index.cjs"), "utf8");
const esmMap = JSON.parse(readFileSync(resolve(projectRoot, "dist/index.js.map"), "utf8"));
const cjsMap = JSON.parse(readFileSync(resolve(projectRoot, "dist/index.cjs.map"), "utf8"));

assert.doesNotMatch(sourceIndex, /(?:^|\/)testing(?:\/|")/m, "The production source entrypoint imports testing code");
assert.doesNotMatch(esmIndex, /createBrowserHarness/, "The production ESM bundle contains testing code");
assert.doesNotMatch(cjsIndex, /createBrowserHarness/, "The production CJS bundle contains testing code");

assert.equal(
    esmMap.sources.some(source => source.includes("/testing/")),
    false,
    "The production ESM source map contains testing modules"
);

assert.equal(
    cjsMap.sources.some(source => source.includes("/testing/")),
    false,
    "The production CJS source map contains testing modules"
);

for (const file of ["dist/testing/index.js", "dist/testing/index.cjs", "dist/testing/index.d.ts"]) {
    readFileSync(resolve(projectRoot, file));
}

for (const file of ["dist/testing/index.js.map", "dist/testing/index.cjs.map"]) {
    assert.equal(existsSync(resolve(projectRoot, file)), false, `${file} must not be published`);
}

const testingDeclarations = readFileSync(resolve(projectRoot, "dist/testing/index.d.ts"), "utf8");

assert.match(testingDeclarations, /^\/\/\/ <reference types="chrome" \/>/);
assert.match(testingDeclarations, /^\/\/\/ <reference path="\.\.\/api\.d\.ts" \/>/m);

assert.equal(
    existsSync(resolve(projectRoot, "dist/testing/index.d.ts.map")),
    false,
    "Testing declaration maps are not published"
);

const listRuntimeSources = directory =>
    readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const file = resolve(directory, entry.name);

        if (entry.isDirectory()) return listRuntimeSources(file);

        assert.doesNotMatch(entry.name, /\.(?:test|spec)\.[cm]?[jt]sx?$/, `Move test ${file} to tests/testing`);

        if (!entry.name.endsWith(".ts")) return [];

        return [{file, source: readFileSync(file, "utf8")}];
    });

const testingRuntimeSources = listRuntimeSources(testingSourceDirectory);
assertPortableTestingGraph(resolve(testingSourceDirectory, "index.ts"));

for (const extension of ["js", "cjs"]) {
    const portable = readFileSync(resolve(projectRoot, `dist/testing/index.${extension}`), "utf8");
    assert.doesNotMatch(portable, /node:|createNodeScriptExecutor/, "Node executor leaked into portable bundle");
    const nodeBundle = readFileSync(resolve(projectRoot, `dist/testing/node/index.${extension}`), "utf8");
    // tsup may remove the node: prefix; both spellings must still be external builtin imports.
    assert.match(nodeBundle, /(?:from\s*|require\()["'](?:node:)?vm["']/);
    assert.equal(existsSync(resolve(projectRoot, `dist/testing/node/index.${extension}.map`)), false);
}

const nodeDeclaration = readFileSync(resolve(projectRoot, "dist/testing/node/index.d.ts"), "utf8");
assert.match(nodeDeclaration, /^\/\/\/ <reference path="\.\.\/\.\.\/api\.d\.ts" \/>/m);
const nodeEsm = await import(new URL("../dist/testing/node/index.js", import.meta.url));
const nodeCjs = require(resolve(projectRoot, "dist/testing/node/index.cjs"));
assert.deepEqual(Object.keys(nodeEsm), ["createNodeScriptExecutor"]);
assert.deepEqual(Object.keys(nodeCjs), ["createNodeScriptExecutor"]);

for (const {file, source} of testingRuntimeSources) {
    assert.doesNotMatch(
        source,
        /(?:from\s+["'](?:@jest\/globals|jest|@rstest\/[^"']*|vitest|sinon)["']|\b(?:jest|rs|vi|expect)\s*\.)/,
        `Testing runtime source ${file} depends on a test runner`
    );
}

console.log("Verified 333 TypeScript exports, 330 ESM/CJS runtime exports, and isolated testing bundles.");
