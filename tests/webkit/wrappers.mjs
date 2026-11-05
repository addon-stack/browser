import {relative, resolve} from "node:path";

import ts from "typescript";

/** Resolve native call symbols instead of maintaining a browser-method allowlist. */
export function collectWrapperMethods(root) {
    const configPath = resolve(root, "tsconfig.json");
    const config = ts.readConfigFile(configPath, ts.sys.readFile);

    if (config.error) {
        throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
    }

    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const checker = program.getTypeChecker();
    const inventory = {};
    const unresolved = [];

    function add(namespace, method, source, node) {
        const file = relative(root, source.fileName).replaceAll("\\", "/");
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        let owner;

        for (let parent = node; parent; parent = parent.parent) {
            if (ts.isVariableDeclaration(parent) && parent.parent?.parent?.modifiers?.some(value => value.kind === ts.SyntaxKind.ExportKeyword)) {
                owner = parent;
            }

            if (ts.isFunctionDeclaration(parent) && parent.modifiers?.some(value => value.kind === ts.SyntaxKind.ExportKeyword)) {
                owner = parent;
            }
        }

        const wrapper = owner?.name?.getText(source) ?? "<module>";
        const references = (inventory[namespace] ??= {})[method] ??= [];

        if (!references.some(value => value.file === file && value.line === line)) {
            references.push({file, line, wrapper});
        }
    }

    function names(type) {
        return (type.isUnion() ? type.types : [type]).flatMap(member => member.isStringLiteral() ? [member.value] : []);
    }

    function symbolMethod(type, method, source, node) {
        for (const member of type.isUnion() ? type.types : [type]) {
            const symbol = checker.getPropertyOfType(member, method);
            const match = symbol && /^(?:chrome|browser|opr)\.([\w$]+)\.([\w$]+)$/.exec(checker.getFullyQualifiedName(symbol));

            if (match) {
                add(match[1], match[2], source, node);
            }
        }
    }

    for (const source of program.getSourceFiles()) {
        const path = relative(root, source.fileName).replaceAll("\\", "/");

        if (!path.startsWith("src/api/") || source.isDeclarationFile || path.endsWith(".test.ts")) {
            continue;
        }

        const visit = node => {
            if (ts.isPropertyAccessExpression(node) && checker.getTypeAtLocation(node).getCallSignatures().length) {
                symbolMethod(checker.getTypeAtLocation(node.expression), node.name.text, source, node);
            }

            if (ts.isCallExpression(node)) {
                if (ts.isIdentifier(node.expression) && node.expression.text === "requireApiMethod") {
                    const [, namespace, method] = node.arguments;
                    const namespaces = namespace ? names(checker.getTypeAtLocation(namespace)) : [];
                    const methods = method ? names(checker.getTypeAtLocation(method)) : [];

                    if (!namespaces.length || !methods.length) {
                        unresolved.push({file: path, call: node.getText(source)});
                    }

                    for (const ns of namespaces) {
                        for (const name of methods) {
                            add(ns, name, source, node);
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(source);
    }

    if (unresolved.length) {
        throw new Error(`Unresolved native method guards: ${JSON.stringify(unresolved)}`);
    }

    if (!Object.keys(inventory).length) {
        throw new Error("No native wrapper methods were discovered");
    }

    // Keep output inspectable and deterministic within a given source revision.
    return Object.fromEntries(Object.entries(inventory).sort().map(([namespace, methods]) => [namespace,
        Object.fromEntries(Object.entries(methods).sort().map(([method, refs]) => [method, refs.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)])),
    ]));
}
