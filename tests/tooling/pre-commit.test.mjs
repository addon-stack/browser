import {spawnSync} from "node:child_process";
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, beforeEach, describe, expect, jest, test} from "@jest/globals";

jest.setTimeout(30000);

const root = fileURLToPath(new URL("../../", import.meta.url));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
// A parent Git hook may export index/worktree paths. Never use them in the test clone.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));

test("pre-commit fixes staged files before testing without formatting the whole worktree", () => {
    const commands = readFileSync(join(root, ".husky/pre-commit"), "utf8").split("\n").filter(line => line.startsWith("npm "));
    expect(commands).toEqual(["npm run lint:staged || exit 1", "npm run test:related || exit 1"]);
    expect(packageJson.scripts["lint:staged"]).toBe("lint-staged");
    expect(packageJson["lint-staged"]).toEqual({"*": "eslint --fix --max-warnings 0 --no-warn-ignored --"});
});

describe("pre-commit staged formatting in an isolated Git clone", () => {
    let temporaryDirectory;
    let cwd;

    const run = (command, args) => spawnSync(command, args, {cwd, env, encoding: "utf8", timeout: 30000});

    const git = (...args) => {
        const result = run("git", ["-c", "core.autocrlf=false", "-c", `core.hooksPath=${join(temporaryDirectory, "no-hooks")}`, ...args]);

        if (result.status !== 0) {
            throw new Error(`Fixture git ${args[0]} failed: ${result.error?.message ?? result.stderr}`);
        }

        return result.stdout;
    };

    const write = (file, source) => {
        const path = join(cwd, file);
        mkdirSync(dirname(path), {recursive: true});
        writeFileSync(path, source);
    };

    const read = file => readFileSync(join(cwd, file), "utf8");
    const staged = file => git("show", `:${file}`);
    const lintStaged = () => run(process.execPath, [join(root, "node_modules/lint-staged/bin/lint-staged.js"), "--quiet"]);

    beforeEach(() => {
        temporaryDirectory = mkdtempSync(join(tmpdir(), "browser-pre-commit-"));
        cwd = temporaryDirectory;
        // Reuse existing history: no test commits, and no writes to the real project's Git metadata.
        git("clone", "--shared", "--quiet", "--", root, "checkout");
        cwd = join(temporaryDirectory, "checkout");
        git("config", "user.name", "Hook Test");
        git("config", "user.email", "hook-test@example.invalid");
        git("config", "core.autocrlf", "false");
        git("config", "core.hooksPath", join(temporaryDirectory, "no-hooks"));

        for (const file of ["package.json", "eslint.config.js", "scripts/eslint"]) {
            cpSync(join(root, file), join(cwd, file), {recursive: true});
        }

        symlinkSync(join(root, "node_modules"), join(cwd, "node_modules"), process.platform === "win32" ? "junction" : "dir");
    });

    afterEach(() => {
        if (temporaryDirectory) {
            rmSync(temporaryDirectory, {recursive: true, force: true});
        }
    });

    test("formats and stages JS/TS and JSON, preserves other files and handles spaces in paths", () => {
        const file = "src/work in progress/ready.ts";
        const source = "export const ready=true\nexport const settings={\nretries:3\n}\nexport const done='yes'\n";
        const expected = "export const ready = true;\n\nexport const settings = {\n    retries: 3,\n};\n\nexport const done = \"yes\";\n";
        const unrelated = "export const unfinished=\n";
        write(file, source);
        write("settings.json", '{"enabled":true}\n');
        write("src/unfinished.ts", unrelated);
        git("add", "--", file, "settings.json");

        const result = lintStaged();
        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
        expect(staged(file)).toBe(expected);
        expect(read(file)).toBe(expected);
        expect(staged("settings.json")).toBe('{\n  "enabled": true\n}\n');
        expect(read("src/unfinished.ts")).toBe(unrelated);
        expect(git("diff", "--cached", "--name-only").trim().split("\n").sort()).toEqual(["settings.json", file]);
        expect(git("stash", "list")).toBe("");
    });

    test("preserves unstaged edits in a partially staged file without committing or formatting them", () => {
        const file = "src/browser.ts";
        const middle = Array.from({length: 12}, (_, index) => `export const marker${index} = ${index};`).join("\n");
        const source = `export const ready=true\n${middle}\nexport const draft = "staged";\n`;
        const draft = "export const draft='unstaged'\n";
        write(file, source);
        git("add", "--", file);
        write(file, source.replace('export const draft = "staged";\n', draft));

        const result = lintStaged();
        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);

        const expected = source.replace("ready=true\n", "ready = true;\n");
        expect(staged(file)).toBe(expected);
        expect(read(file)).toBe(expected.replace('export const draft = "staged";\n', draft));
        expect(git("diff", "--name-only").trim().split("\n")).toContain(file);
        expect(git("stash", "list")).toBe("");
    });

    test.each([
        ["src/BadName.ts", "export const ready=true\n", "project/file-naming"],
        ["src/invalid.ts", "export const =\n", "Parsing error"],
        ["docs/BadName.md", "Documentation stays unchanged.\n", "project/file-naming"],
    ])("blocks %s and restores the staged/unstaged state when linting fails", (file, source, message) => {
        const goodFile = "src/good-name.ts";
        const goodSource = "export const ready=true\n";
        write(file, source);
        write(goodFile, goodSource);
        git("add", "--", file, goodFile);
        write(goodFile, `${goodSource}\n// Keep this edit unstaged.\n`);

        const stagedBefore = git("diff", "--cached", "--binary");
        const unstagedBefore = git("diff", "--binary");
        const result = lintStaged();
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain(message);
        expect(git("diff", "--cached", "--binary")).toBe(stagedBefore);
        expect(git("diff", "--binary")).toBe(unstagedBefore);
        expect(read(file)).toBe(source);
        expect(staged(goodFile)).toBe(goodSource);
        expect(git("stash", "list")).toBe("");
    });

    test("allows ignored lockfiles and staged deletions without ignored-file warnings", () => {
        const source = read("package-lock.json");
        write("package-lock.json", `${source}\n`);
        git("add", "--", "package-lock.json");
        git("rm", "--", "src/browser.ts");

        const result = lintStaged();
        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
        expect(staged("package-lock.json")).toBe(`${source}\n`);
        expect(git("diff", "--cached", "--name-status")).toContain("D\tsrc/browser.ts");
    });

    test("allows an empty staged selection without formatting anything", () => {
        const before = git("diff", "--binary");
        const result = lintStaged();
        expect(result.status).toBe(0);
        expect(git("diff", "--binary")).toBe(before);
        expect(git("diff", "--cached")).toBe("");
    });
});
