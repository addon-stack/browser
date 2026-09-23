import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isBuiltin} from "node:module";
import ts from "typescript";

// Include type-only, dynamic imports and require: an erased import must not hide a Node-only dependency either.
export function moduleSpecifiers(text, file) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const specifiers = [];

    const add = node => {
        assert.ok(node && ts.isStringLiteralLike(node), `Non-literal module dependency in ${file}`);
        specifiers.push(node.text);
    };

    const visit = node => {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) add(node.moduleSpecifier);
        else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal);
        else if (ts.isExternalModuleReference(node)) add(node.expression);
        else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) && node.expression.text === "require"))) add(node.arguments[0]);

        ts.forEachChild(node, visit);
    };

    visit(source);

    return specifiers;
}

export function assertPortableTestingGraph(entry, {
    read = file => readFileSync(file, "utf8"),
    resolve = (specifier, from) => ts.resolveModuleName(specifier, from, {
        moduleResolution: ts.ModuleResolutionKind.Node10,
    }, ts.sys).resolvedModule?.resolvedFileName,
} = {}) {
    const visited = new Set();

    const visit = (file, path) => {
        if (visited.has(file)) return;

        visited.add(file);

        for (const specifier of moduleSpecifiers(read(file), file)) {
            const chain = [...path, `${file} -> ${specifier}`];
            assert.ok(!specifier.startsWith("node:") && !isBuiltin(specifier), `Node dependency in portable testing graph: ${chain.join("; ")}`);
            const resolved = resolve(specifier, file);
            assert.ok(resolved, `Unresolved dependency: ${chain.join("; ")}`);
            visit(resolved, chain);
        }
    };

    visit(entry, []);

    return visited;
}
