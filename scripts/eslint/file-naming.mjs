import path from "node:path";
import paddingAroundMultiline from "./padding-around-multiline.mjs";

const kebabCase = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const pascalCase = /^[A-Z][a-zA-Z0-9]*$/;
const nativeErrors = new Set(["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError", "EvalError", "AggregateError"]);

const memberName = node => node?.name ?? node?.value;

const isExports = node => node?.type === "Identifier" && node.name === "exports"
    || node?.type === "MemberExpression" && node.object.type === "Identifier"
    && node.object.name === "module" && memberName(node.property) === "exports";

const classBinding = declaration => {
    if (declaration?.type === "ClassDeclaration" || declaration?.type === "ClassExpression") {
        return declaration.id?.name ?? null;
    }

    return undefined;
};

const exportedClasses = program => {
    const bindings = new Map();
    const exported = new Set();

    for (const statement of program.body) {
        const declaration = statement.declaration ?? statement;

        if (declaration.type === "ClassDeclaration" && declaration.id) {
            bindings.set(declaration.id.name, {name: declaration.id.name, declaration});
        }

        if (declaration.type === "VariableDeclaration") {
            for (const variable of declaration.declarations) {
                if (variable.id.type === "Identifier" && variable.init?.type === "ClassExpression") {
                    bindings.set(variable.id.name, {name: variable.init.id?.name ?? variable.id.name, declaration: variable.init});
                }
            }
        }
    }

    const isErrorBase = (base, seen = new Set()) => {
        if (base?.type === "Identifier") {
            if (seen.has(base.name)) {
                return false;
            }

            const binding = bindings.get(base.name);

            if (binding) {
                return isErrorBase(binding.declaration.superClass, new Set([...seen, base.name]));
            }

            return nativeErrors.has(base.name);
        }

        return base?.type === "MemberExpression" && base.object.type === "Identifier"
            && base.object.name === "globalThis" && nativeErrors.has(memberName(base.property));
    };

    const add = node => {
        if (node?.type === "Identifier" && bindings.has(node.name)) {
            const binding = bindings.get(node.name);

            if (!isErrorBase(binding.declaration.superClass)) {
                exported.add(binding.name);
            }
        } else if (classBinding(node) !== undefined && !isErrorBase(node.superClass)) {
            exported.add(classBinding(node));
        }
    };

    for (const statement of program.body) {
        if (statement.type === "ExportNamedDeclaration" && !statement.source) {
            add(statement.declaration);

            for (const specifier of statement.specifiers) {
                add(specifier.local);
            }

            if (statement.declaration?.type === "VariableDeclaration") {
                for (const variable of statement.declaration.declarations) {
                    add(variable.id);
                }
            }
        } else if (statement.type === "ExportDefaultDeclaration") {
            add(statement.declaration);
        } else if (statement.type === "TSExportAssignment") {
            add(statement.expression);
        } else if (statement.type === "ExpressionStatement" && statement.expression.type === "AssignmentExpression") {
            const {left, right} = statement.expression;

            if (isExports(left) || left.type === "MemberExpression" && isExports(left.object)) {
                if (right.type === "ObjectExpression") {
                    for (const property of right.properties) {
                        add(property.value);
                    }
                } else {
                    add(right);
                }
            }
        }
    }

    return [...exported];
};

export default {
    meta: {name: "browser-project-rules"},
    processors: {
        // Non-code files only participate in filename checks, not JS formatting.
        "filename-only": {
            preprocess: () => [""],
            postprocess: messages => messages.flat(),
        },
    },
    rules: {
        "padding-around-multiline": paddingAroundMultiline,
        "file-naming": {
            meta: {
                type: "suggestion",
                docs: {description: "Match exported class filenames and use kebab-case for other files."},
                schema: [{
                    type: "object",
                    properties: {exceptions: {type: "array", items: {type: "string"}}},
                    additionalProperties: false,
                }],
                messages: {
                    kebab: "Use kebab-case for ordinary files and their dot-separated suffixes: '{{name}}'.",
                    className: "A file exporting class '{{className}}' must be named '{{className}}.{{extension}}' (PascalCase).",
                    anonymous: "Name the exported class so its PascalCase name can match the filename.",
                    multiple: "Export classes from separate matching PascalCase files; this file defines: {{names}}.",
                    testName: "Test filenames must use kebab-case, or PascalCase for a class under test; keep suffixes such as .integration.test lowercase.",
                },
            },
            create(context) {
                return {
                    Program(program) {
                        const filename = context.physicalFilename;

                        if (!filename || filename.startsWith("<")) {
                            return;
                        }

                        const basename = path.basename(filename);

                        if (context.options[0]?.exceptions?.includes(basename)) {
                            return;
                        }

                        const parts = basename.replace(/^\./, "").split(".");
                        const extension = parts.length > 1 ? parts.pop() : "";
                        const [stem, ...suffixes] = parts;
                        const classes = exportedClasses(program);
                        const report = (messageId, data) => context.report({node: program, messageId, data});

                        if (classes.includes(null)) {
                            report("anonymous");
                        } else if (classes.length > 1) {
                            report("multiple", {names: classes.join(", ")});
                        } else if (classes.length === 1) {
                            const [className] = classes;
                            const declarationSuffix = suffixes.length === 1 && suffixes[0] === "d";

                            if (stem !== className || !pascalCase.test(className) || (suffixes.length && !declarationSuffix)) {
                                report("className", {className, extension: declarationSuffix ? `d.${extension}` : extension});
                            }
                        } else if (suffixes.includes("test") || suffixes.includes("spec")) {
                            if ((!kebabCase.test(stem) && !pascalCase.test(stem)) || suffixes.some(suffix => !kebabCase.test(suffix))) {
                                report("testName");
                            }
                        } else if (parts.some(part => !kebabCase.test(part))) {
                            report("kebab", {name: basename});
                        }
                    },
                };
            },
        },
    },
};
