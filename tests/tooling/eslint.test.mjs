import {fileURLToPath} from "node:url";
import {describe, expect, test} from "@jest/globals";
import {ESLint} from "eslint";
import config from "../../eslint.config.js";

const cwd = fileURLToPath(new URL("../../", import.meta.url));
const createLinter = fix => new ESLint({cwd, fix, overrideConfigFile: true, overrideConfig: config});
const checker = createLinter(false);
const fixer = createLinter(true);

const messagesFor = async (source, filePath) => {
    const [result] = await checker.lintText(source, {filePath});

    return result.messages.filter(message => message.ruleId === "project/file-naming");
};

describe("ESLint project configuration", () => {
    test("checks formatting without editing and fixes blank lines and whitespace idempotently", async () => {
        const source = "export function collect (items: string[]) {\nconst result=[]\nif (!items.length) {\nreturn result\n}\nfor (const item of items) {\nresult.push(item)\n}\nreturn result\n}\n";
        const filePath = "src/collect.ts";
        const [checked] = await checker.lintText(source, {filePath});
        expect(checked.messages.some(message => message.ruleId === "@stylistic/padding-line-between-statements")).toBe(true);
        expect(checked.output).toBeUndefined();

        const [fixed] = await fixer.lintText(source, {filePath});
        expect(fixed.messages).toEqual([]);

        expect(fixed.output).toBe([
            "export function collect(items: string[]) {",
            "    const result = [];",
            "",
            "    if (!items.length) {",
            "        return result;",
            "    }",
            "",
            "    for (const item of items) {",
            "        result.push(item);",
            "    }",
            "",
            "    return result;",
            "}",
            "",
        ].join("\n"));

        const [again] = await fixer.lintText(fixed.output, {filePath});
        expect(again.messages).toEqual([]);
        expect(again.output).toBeUndefined();
    });

    test.each([
        "if (value) { value--; }",
        "for (let i = 0; i < value; i++) { value--; }",
        "for (const item of [value]) { value += item; }",
        "while (value > 0) { value--; }",
        "do { value--; } while (value > 0);",
        "switch (value) { case 1: value--; break; }",
    ])("separates both sides of %s", async statement => {
        const source = `export function run() {\nlet value = 1;\n${statement}\nvalue++;\nreturn value;\n}\n`;
        const [fixed] = await fixer.lintText(source, {filePath: "src/run.ts"});
        expect(fixed.messages).toEqual([]);
        expect(fixed.output).toMatch(/let value = 1;\n\n/);
        expect(fixed.output).toMatch(/\n\n {4}value\+\+;\n\n {4}return value;/);
    });

    test("keeps declarations together, has no padding inside blocks and does not split if/else", async () => {
        const source = "export function run(flag: boolean) {\nconst a = 1;\nconst b = 2;\nif (flag) {\nreturn a;\n} else {\nreturn b;\n}\n}\n";
        const [result] = await fixer.lintText(source, {filePath: "src/run.ts"});
        expect(result.messages).toEqual([]);
        expect(result.output).toContain("const a = 1;\n    const b = 2;\n\n    if");
        expect(result.output).toContain("} else {\n        return b;\n    }");
    });

    test("formats quotes, semicolons, brackets and sorts imports", async () => {
        const source = "import { z } from './z';\nimport { a } from './a';\nexport const result = { a: a, z: z, label: 'ok' }\n";
        const [result] = await fixer.lintText(source, {filePath: "src/sorted.ts"});
        expect(result.messages).toEqual([]);
        expect(result.output).toBe('import {a} from "./a";\nimport {z} from "./z";\n\nexport const result = {a: a, z: z, label: "ok"};\n');
    });

    test("fixes multiline spacing with exactly one blank line and preserves import/re-export groups", async () => {
        const source = [
            "import {",
            "    a,",
            '} from "./a";',
            'import {b} from "./b";',
            "export const enabled = true;",
            "export const options = {",
            "    a,",
            "    b,",
            "};",
            "export const done = true;",
            "export {",
            "    c,",
            '} from "./c";',
            'export {d} from "./d";',
            "",
        ].join("\n");

        const filePath = "src/spacing.ts";
        const [checked] = await checker.lintText(source, {filePath});
        expect(checked.messages.some(message => message.ruleId === "project/padding-around-multiline")).toBe(true);
        expect(checked.output).toBeUndefined();

        const [result] = await fixer.lintText(source, {filePath});
        expect(result.messages).toEqual([]);

        expect(result.output).toBe(source
            .replace('import {b} from "./b";\n', 'import {b} from "./b";\n\n')
            .replace("export const enabled = true;\n", "export const enabled = true;\n\n")
            .replace("};\n", "};\n\n")
            .replace("export const done = true;\n", "export const done = true;\n\n"));

        const [again] = await fixer.lintText(result.output, {filePath});
        expect(again.messages).toEqual([]);
        expect(again.output).toBeUndefined();

        const [extraLines] = await fixer.lintText(result.output.replaceAll("\n\n", "\n\n\n"), {filePath});
        expect(extraLines.messages).toEqual([]);
        expect(extraLines.output).toBe(result.output);
    });

    test("formats JSON and JSONC, but preserves the strict JSON/JSONC boundary", async () => {
        const [result] = await fixer.lintText('{ "enabled":true,"items":["a","b"]}', {filePath: "settings.json"});
        expect(result.messages).toEqual([]);
        expect(result.output).toBe('{\n  "enabled": true,\n  "items": [\n    "a",\n    "b"\n  ]\n}\n');

        const [again] = await fixer.lintText(result.output, {filePath: "settings.json"});
        expect(again.messages).toEqual([]);
        expect(again.output).toBeUndefined();

        const comment = '// configuration\n{ "enabled":true }\n';
        const [jsonc] = await fixer.lintText(comment, {filePath: "settings.jsonc"});
        expect(jsonc.messages).toEqual([]);
        expect(jsonc.output).toContain("// configuration");

        const [json] = await checker.lintText(comment, {filePath: "settings.json"});
        expect(json.messages.some(message => message.ruleId === "jsonc/no-comments")).toBe(true);
    });

    test("retains any and reports non-fixable unused variables", async () => {
        const [result] = await fixer.lintText("export function identity(value: any) { const unused = 1; return value; }", {filePath: "src/identity.ts"});
        expect(result.messages.some(message => message.ruleId === "@typescript-eslint/no-unused-vars")).toBe(true);
        expect(result.messages.some(message => message.ruleId === "@typescript-eslint/no-explicit-any")).toBe(false);
    });

    test.each(["dist/output.js", "coverage/report.js", "addon/main.ts", "package-lock.json", "node_modules/example/index.js"])("ignores generated/dependency file %s", async filePath => {
        expect(await checker.isPathIgnored(filePath)).toBe(true);
    });

    test.each(["src/module-name.ts", "src/api.d.ts", "src/module-name.test.ts", "src/Example.test.ts", "src/Example.integration.test.ts", "tests/module-name.spec.mjs", "tsup.config.ts"])("accepts ordinary/test filename %s", async filePath => {
        expect(await messagesFor("export {};\n", filePath)).toEqual([]);
    });

    test.each([
        "export class Example {}",
        "export default class Example {}",
        "class Example {} export {Example};",
        "class Example {} export default Example;",
        "export const Example = class {};",
        "export abstract class Example {}",
        "export declare class Example {}",
    ])("requires an exact PascalCase filename for %s", async source => {
        expect(await messagesFor(source, "src/Example.ts")).toEqual([]);
        expect(await messagesFor(source, "src/example.ts")).toHaveLength(1);
        expect(await messagesFor(source, "src/Other.ts")).toHaveLength(1);
    });

    test.each([
        "class Example {} module.exports = Example;",
        "exports.Example = class Example {};",
        "class Example {} module.exports = {Example};",
    ])("handles CommonJS class exports: %s", async source => {
        expect(await messagesFor(source, "src/Example.cjs")).toEqual([]);
        expect(await messagesFor(source, "src/example.cjs")).toHaveLength(1);
    });

    test.each([
        "export class DownloadError extends Error {}",
        "export class SidebarError extends globalThis.Error {}",
        "export class ValidationError extends TypeError {}",
        "class BaseError extends Error {} export class DownloadError extends BaseError {}",
        "class DownloadError extends Error {} export {DownloadError};",
        "export default class extends Error {}",
    ])("keeps exception classes in their owning module: %s", async source => {
        expect(await messagesFor(source, "src/downloads.ts")).toEqual([]);
    });

    test("ignores exception classes alongside a regular exported class", async () => {
        const source = "export class Example {} export class ExampleError extends Error {}";
        expect(await messagesFor(source, "src/Example.ts")).toEqual([]);
        expect(await messagesFor(source, "src/Other.ts")).toHaveLength(1);
    });

    test("allows class re-exports from a kebab-case barrel", async () => {
        expect(await messagesFor('export {Example} from "./Example";\n', "src/index.ts")).toEqual([]);
    });

    test("rejects anonymous, multiple and non-PascalCase exported classes", async () => {
        expect((await messagesFor("export default class {}", "src/Example.ts"))[0].messageId).toBe("anonymous");
        expect((await messagesFor("export class One {} export class Two {}", "src/One.ts"))[0].messageId).toBe("multiple");
        expect(await messagesFor("export class example {}", "src/example.ts")).toHaveLength(1);
    });

    test.each(["src/moduleName.ts", "src/ModuleName.ts", "src/module_name.ts", "src/moduleName.test.ts", "src/Example.Integration.test.ts", "docs/moduleName.md", ".github/workflows/buildCheck.yml"])("rejects filename %s without renaming it", async filePath => {
        const [result] = await fixer.lintText("", {filePath});
        expect(result.messages.filter(message => message.ruleId === "project/file-naming")).toHaveLength(1);
        expect(result.output).toBeUndefined();
    });

    test.each(["README.md", "CONTRIBUTING.md", "LICENSE.md", ".gitignore", ".husky/pre-commit", "package.json"])("preserves standard filename %s", async filePath => {
        expect(await messagesFor(filePath.endsWith(".json") ? "{}\n" : "", filePath)).toEqual([]);
    });
});
