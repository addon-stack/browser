import {describe, expect, test} from "@jest/globals";
import {Linter} from "eslint";
import tseslint from "typescript-eslint";
import paddingAroundMultiline from "../../scripts/eslint/padding-around-multiline.mjs";

const linter = new Linter();

const config = [{
    files: ["**/*.ts"],
    languageOptions: {parser: tseslint.parser},
    plugins: {project: {rules: {"padding-around-multiline": paddingAroundMultiline}}},
    rules: {"project/padding-around-multiline": "error"},
}];

const options = {filename: "spacing.ts"};

const assertFix = (source, expected) => {
    const result = linter.verifyAndFix(source, config, options);
    expect(result.messages).toEqual([]);
    expect(result.output).toBe(expected);
    expect(linter.verifyAndFix(result.output, config, options).fixed).toBe(false);
};

describe("multiline statement padding", () => {
    test.each([
        "const options = {\n    retries: 3,\n};",
        "const items = [\n    1,\n];",
        "const {\n    value,\n} = options;",
        "let value =\n    compute();",
        "var value =\n    compute();",
        "const run = () => {\n    work();\n};",
        "const value = ready\n    ? first\n    : second;",
        "const message = `first\nsecond`;",
        "start(\n    options\n);",
        "await start(\n    options\n);",
        "items\n    .filter(Boolean)\n    .map(convert);",
        "value = {\n    enabled: true,\n};",
        "function run() {\n    work();\n}",
        "class Client {\n    run() {}\n}",
        "interface Options {\n    enabled: boolean;\n}",
        "type Options = {\n    enabled: boolean;\n};",
        "type Choice =\n    | string\n    | number;",
        "enum Choice {\n    First,\n    Second,\n}",
        "export const options = {\n    enabled: true,\n};",
        "export default {\n    enabled: true,\n};",
        "export function run() {\n    work();\n}",
        "export class Client {\n    run() {}\n}",
        "export type Options = {\n    enabled: boolean;\n};",
        "try {\n    work();\n} catch {\n    recover();\n}",
    ])("separates both sides of %s", statement => {
        const source = `before();\n${statement}\nafter();\n`;
        expect(linter.verify(source, config, options)).toHaveLength(2);
        assertFix(source, `before();\n\n${statement}\n\nafter();\n`);
    });

    test.each([
        ["function run() {\n", "\n}"],
        ["class Client { static {\n", "\n} }"],
        ["namespace Example {\n", "\n}"],
        ["switch (value) { case 1:\n", "\n}"],
    ])("separates neighboring statements inside %s", (prefix, suffix) => {
        const statement = "const options = {\n    enabled: true,\n};";

        assertFix(`${prefix}before();\n${statement}\nafter();${suffix}\n`,
            `${prefix}before();\n\n${statement}\n\nafter();${suffix}\n`);
    });

    test("does not pad file/block boundaries or separate arguments and object/type/class members", () => {
        const source = [
            "export function run() {",
            "    const options = {",
            "        first: {",
            "            enabled: true,",
            "        },",
            "        second: true,",
            "    };",
            "",
            "    start(",
            "        options,",
            "        {",
            "            retries: 3,",
            "        },",
            "        finish",
            "    );",
            "}",
            "",
            "interface Options {",
            "    first: {",
            "        enabled: boolean;",
            "    };",
            "    second: boolean;",
            "}",
            "",
            "class Client {",
            "    run() {",
            "        work();",
            "    }",
            "    stop() {}",
            "}",
            "",
        ].join("\n");

        assertFix(source, source);
    });

    test("keeps single-line statements together", () => {
        const source = "const a = 1;\nconst b = 2;\nstart(a, b);\n";
        assertFix(source, source);
    });

    test("inserts only one shared blank line between consecutive multiline statements", () => {
        const first = "const options = {\n    enabled: true,\n};";
        const second = "start(\n    options\n);";
        assertFix(`${first}\n${second}\n`, `${first}\n\n${second}\n`);
    });

    test("preserves trailing comments, JSDoc and ESLint directive attachment", () => {
        const source = "const options = {\n    enabled: true,\n}; // options\n// eslint-disable-next-line no-console\nconsole.log(options);\n/** Run the task. */\nfunction run() {\n    work();\n}\nfinish();\n";
        const expected = "const options = {\n    enabled: true,\n}; // options\n\n// eslint-disable-next-line no-console\nconsole.log(options);\n\n/** Run the task. */\nfunction run() {\n    work();\n}\n\nfinish();\n";
        const directiveConfig = [{...config[0], linterOptions: {reportUnusedDisableDirectives: false}}];
        const result = linter.verifyAndFix(source, directiveConfig, options);
        expect(result.messages).toEqual([]);
        expect(result.output).toBe(expected);
        expect(linter.verifyAndFix(result.output, directiveConfig, options).fixed).toBe(false);
    });

    test("handles adjacent code on the same line", () => {
        assertFix("before(); const options = {\n}; after();\n", "before();\n\n const options = {\n};\n\n after();\n");
    });

    test("does not add another blank line if comments are already separated", () => {
        const source = "const options = {\n};\n\n// Options are ready.\nstart(options);\n";
        assertFix(source, source);
    });
});
