import {spawnSync} from "node:child_process";
import {copyFileSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

const root = fileURLToPath(new URL("../../", import.meta.url));
// Hooks may export paths into the real repository; fixture Git commands must stay isolated.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));

describe("release-it version and release-note policies through the installed CLI", () => {
    let directory;

    const git = (...args) => {
        const result = spawnSync("git", [
            "-c", "core.autocrlf=false",
            "-c", "commit.gpgSign=false",
            "-c", "tag.gpgSign=false",
            "-c", `core.hooksPath=${join(directory, "no-hooks")}`,
            ...args,
        ], {cwd: directory, env, encoding: "utf8", timeout: 10000});

        if (result.status !== 0) {
            throw new Error(`Fixture git ${args[0]} failed: ${result.error?.message ?? result.stderr}`);
        }

        return result.stdout.trim();
    };

    const prepare = (version, messages) => {
        const pkg = {name: "@addon-core/browser-release-test", version};
        writeFileSync(join(directory, "package.json"), JSON.stringify(pkg));
        writeFileSync(join(directory, "package-lock.json"), JSON.stringify({...pkg, lockfileVersion: 3, packages: {"": pkg}}));
        writeFileSync(join(directory, "CHANGELOG.md"), "# Fixture changelog\n");
        git("add", ".");
        git("commit", "--quiet", "-m", "chore: initial release");
        git("tag", `v${version}`);

        for (const message of messages) {
            git("commit", "--quiet", "--allow-empty", "-m", message);
        }
    };

    const preview = (mode = "--release-version", ...args) => {
        const files = ["package.json", "package-lock.json", "CHANGELOG.md"];
        const before = files.map(file => readFileSync(join(directory, file), "utf8"));
        const head = git("rev-parse", "HEAD");
        const tags = git("tag", "--list");

        // Preview modes exit before writes; fixtures have no remotes and publishing is disabled.
        const result = spawnSync(process.execPath, [
            join(root, "node_modules/release-it/bin/release-it.js"),
            "--ci", "--no-github", "--npm.publish=false",
            "--git.commit=false", "--git.tag=false", "--git.push=false", "--git.requireCommits=false",
            mode, ...args,
        ], {cwd: directory, env, encoding: "utf8", timeout: 10000});

        expect(result.error).toBeUndefined();
        expect(files.map(file => readFileSync(join(directory, file), "utf8"))).toEqual(before);
        expect(git("rev-parse", "HEAD")).toBe(head);
        expect(git("tag", "--list")).toBe(tags);
        expect(git("status", "--porcelain")).toBe("");

        return result;
    };

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "browser-release-policy-"));
        copyFileSync(join(root, ".release-it.cjs"), join(directory, ".release-it.cjs"));
        symlinkSync(join(root, "node_modules"), join(directory, "node_modules"), process.platform === "win32" ? "junction" : "dir");
        writeFileSync(join(directory, ".gitignore"), "node_modules/\n");
        git("init", "--quiet");
        git("config", "user.name", "Release Test");
        git("config", "user.email", "release-test@example.invalid");
    });

    afterEach(() => {
        if (directory) {
            rmSync(directory, {recursive: true, force: true});
        }
    });

    test.each([
        ["0.9.0", "0.10.0"],
        ["0.99.9", "0.100.0"],
        ["1.0.0", "1.1.0"],
        ["2.4.7", "2.5.0"],
    ])("breaking changes from %s produce minor %s", (current, expected) => {
        prepare(current, ["fix(api)!: change the sidebar contract"]);
        const result = preview();
        expect(result.stdout.trim()).toBe(expected);
        expect(result.status).toBe(0);
    });

    test.each([
        "refactor!: change the contract",
        "chore(api)!: change the contract",
        "fix(api): change the contract\n\nBREAKING CHANGE: callers must migrate",
        "fix(api): change the contract\n\nBREAKING-CHANGE: callers must migrate",
        "feat(api): add a method",
        "revert: restore the previous API",
    ])("uses a minor bump for %s", message => {
        prepare("0.9.0", [message]);
        const result = preview();
        expect(result.stdout.trim()).toBe("0.10.0");
        expect(result.status).toBe(0);
    });

    test.each(["fix", "perf", "refactor", "ci"])("uses a patch bump for %s", type => {
        prepare("1.0.0", [`${type}: improve existing behavior`]);
        const result = preview();
        expect(result.stdout.trim()).toBe("1.0.1");
        expect(result.status).toBe(0);
    });

    test.each(["docs", "test", "chore", "build", "style", "features"])("does not release for %s alone", type => {
        prepare("0.9.0", [`${type}: maintain the project`]);
        const result = preview();
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain("No new version to release");
    });

    test("minor changes take precedence over surrounding patches", () => {
        prepare("0.9.0", ["fix: first correction", "refactor(api)!: change the contract", "ci: update checks"]);
        expect(preview().stdout.trim()).toBe("0.10.0");
    });

    test("does not release when there are no commits since the last tag", () => {
        prepare("0.9.0", []);
        const result = preview();
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain("No new version to release");
    });

    test("preserves breaking-change notes and the parsed subject in the changelog", () => {
        prepare("0.9.0", ["refactor(api)!: change the sidebar contract"]);
        const result = preview("--changelog");
        expect(result.status).toBe(0);
        expect(result.stdout).toContain("v0.10.0");
        expect(result.stdout).toContain("### 💥 Breaking Changes");
        expect(result.stdout).toContain("* change the sidebar contract");
        expect(result.stdout).toContain("**api:** change the sidebar contract");
        expect(result.stdout).not.toContain("refactor(api)!:");
    });

    test("includes only allowed commit types in the changelog and GitHub release notes", () => {
        const allowed = ["feat", "fix", "perf", "refactor", "revert"];
        const excluded = ["docs", "test", "chore", "build", "ci", "style", "unknown", "feature", "features"];

        prepare("0.9.0", [
            ...allowed.map(type => `${type}(api): visible ${type} change`),
            ...excluded.map(type => `${type}(tooling): excluded ${type} change\n\nexcluded ${type} body`),
            "docs(api)!: excluded breaking documentation",
            "build: excluded breaking build\n\nBREAKING CHANGE: excluded build migration",
            "unknown!: excluded breaking unknown type",
            "Merge branch 'excluded-branch' into develop",
            "excluded untyped maintenance",
        ]);

        const result = preview("--changelog");
        expect(result.status).toBe(0);

        for (const type of allowed) {
            expect(result.stdout).toContain(`**api:** visible ${type} change`);
        }

        for (const section of ["✨ Features", "🐛 Bug Fixed", "⚡️ Performance Improvements", "🛠️ Refactoring", "⏪ Reverts"]) {
            expect(result.stdout.split(`### ${section}`)).toHaveLength(2);
        }

        expect(result.stdout).not.toContain("excluded");
        expect(result.stdout).not.toContain("### 💥 Breaking Changes");
        expect(result.stdout).not.toContain("🧩 Other");

        // Exercise the configured GitHub adapter with the actual generated changelog, without contacting GitHub.
        const github = spawnSync(process.execPath, ["-e", `
            const {readFileSync} = require("node:fs");
            const {github} = require("./.release-it.cjs")();
            const changelog = readFileSync(0, "utf8");
            const notes = github.releaseNotes({changelog});
            process.stdout.write(JSON.stringify({autoGenerate: github.autoGenerate, notes}));
        `], {cwd: directory, env, input: result.stdout, encoding: "utf8", timeout: 10000});

        expect(github.status).toBe(0);
        expect(JSON.parse(github.stdout)).toEqual({autoGenerate: false, notes: result.stdout});
    });

    test("excluded breaking commits still bump minor without appearing in release notes", () => {
        prepare("0.9.0", ["chore!: excluded tooling migration", "docs: excluded documentation"]);
        const version = preview();
        expect(version.status).toBe(0);
        expect(version.stdout.trim()).toBe("0.10.0");

        const changelog = preview("--changelog");
        expect(changelog.status).toBe(0);
        expect(changelog.stdout).not.toContain("excluded");
        expect(changelog.stdout).not.toContain("### 💥 Breaking Changes");
        expect(changelog.stdout).not.toContain("🧩 Other");
    });

    test.each([
        ["feat", 0],
        ["features", 1],
        ["chore", 0],
        ["unknown", 1],
    ])("commitlint validates %s with exit code %s", (type, status) => {
        const result = spawnSync(process.execPath, [
            join(root, "node_modules/@commitlint/cli/cli.js"),
            "--config", join(root, ".commitlintrc.json"),
        ], {cwd: directory, env, input: `${type}(api): maintain the package\n`, encoding: "utf8", timeout: 10000});

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(status);
    });

    test.each([
        ["0.9.0", "1.0.0"],
        ["1.0.0", "2.0.0"],
    ])("allows an explicitly requested major from %s without redirecting %s", (current, expected) => {
        prepare(current, ["feat: add a method"]);
        const result = preview("--release-version", "--increment=major");
        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe(expected);
    });

    test("writes an automatic minor for breaking changes without publishing or changing Git history", () => {
        prepare("1.0.0", ["feat(api)!: change the contract"]);
        const head = git("rev-parse", "HEAD");
        const tags = git("tag", "--list");

        const result = spawnSync(process.execPath, [
            join(root, "node_modules/release-it/bin/release-it.js"),
            "--ci", "--no-github", "--npm.publish=false",
            "--git.commit=false", "--git.tag=false", "--git.push=false",
        ], {cwd: directory, env, encoding: "utf8", timeout: 10000});

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version).toBe("1.1.0");
        const lock = JSON.parse(readFileSync(join(directory, "package-lock.json"), "utf8"));
        expect(lock.version).toBe("1.1.0");
        expect(lock.packages[""].version).toBe("1.1.0");
        const changelog = readFileSync(join(directory, "CHANGELOG.md"), "utf8");
        expect(changelog).toContain("v1.1.0");
        expect(changelog).not.toContain("v2.0.0");
        expect(git("rev-parse", "HEAD")).toBe(head);
        expect(git("tag", "--list")).toBe(tags);
    });
});
