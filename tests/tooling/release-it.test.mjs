import {spawnSync} from "node:child_process";
import {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from "node:fs";
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
        const {scripts} = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

        const pkg = {
            name: "@addon-core/browser-release-test", version,
            scripts: {"release:preview": scripts["release:preview"], "release:notes": scripts["release:notes"]},
        };

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

    const setVersion = version => {
        const packagePath = join(directory, "package.json");
        const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
        pkg.version = version;
        writeFileSync(packagePath, JSON.stringify(pkg));
        const lockPath = join(directory, "package-lock.json");
        const lock = JSON.parse(readFileSync(lockPath, "utf8"));
        lock.version = version;
        lock.packages[""].version = version;
        writeFileSync(lockPath, JSON.stringify(lock));
    };

    const prepareRecovery = () => {
        prepare("0.9.0", ["refactor(sidebar)!: change the sidebar contract"]);
        git("commit", "--quiet", "--allow-empty", "--author", "Early Contributor <early@example.invalid>", "-m", "feat(api): add bookmarks");
        setVersion("1.0.0");
        git("add", ".");
        git("commit", "--quiet", "-m", "chore(release): v1.0.0");
        git("tag", "v1.0.0");
        git("commit", "--quiet", "--allow-empty", "-m", "fix: correct release configuration");
        setVersion("0.9.0");
        git("add", ".");
        git("commit", "--quiet", "-m", "chore: restore the 0.x release baseline");
    };

    const release = (...args) => spawnSync(process.execPath, [
        join(root, "node_modules/release-it/bin/release-it.js"),
        "--ci", "--no-github", "--npm.publish=false",
        "--git.commit=false", "--git.tag=false", "--git.push=false",
        ...args,
    ], {cwd: directory, env, encoding: "utf8", timeout: 10000});

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
        mkdirSync(join(directory, "scripts"));
        copyFileSync(join(root, "scripts/ReleaseVersionGuard.mjs"), join(directory, "scripts/ReleaseVersionGuard.mjs"));
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
        ["1.0.1", "2.0.0"],
        ["1.99.9", "2.0.0"],
        ["2.0.0", "3.0.0"],
        ["2.4.7", "3.0.0"],
        ["3.4.7", "4.0.0"],
    ])("breaking changes from %s produce %s", (current, expected) => {
        prepare(current, ["fix(api)!: change the sidebar contract"]);
        const result = preview();
        expect(result.stdout.trim()).toBe(expected);
        expect(result.status).toBe(0);
    });

    describe.each([
        ["0.9.0", "0.10.0"],
        ["1.0.1", "2.0.0"],
        ["2.4.7", "3.0.0"],
    ])("breaking markers from %s produce %s", (current, expected) => {
        test.each([
            "refactor!: change the contract",
            "chore(api)!: change the contract",
            "fix(api): change the contract\n\nBREAKING CHANGE: callers must migrate",
            "fix(api): change the contract\n\nBREAKING-CHANGE: callers must migrate",
        ])("recognizes %s", message => {
            prepare(current, [message]);
            const result = preview();
            expect(result.stdout.trim()).toBe(expected);
            expect(result.status).toBe(0);
        });
    });

    test.each(["feat", "revert"])("uses a minor bump for non-breaking %s starting with 1.x", type => {
        prepare("1.4.7", [`${type}(api): update a method`]);
        const result = preview();
        expect(result.stdout.trim()).toBe("1.5.0");
        expect(result.status).toBe(0);
    });

    test.each(["fix", "perf", "refactor", "ci"])("uses a patch bump for %s", type => {
        prepare("1.4.7", [`${type}: improve existing behavior`]);
        const result = preview();
        expect(result.stdout.trim()).toBe("1.4.8");
        expect(result.status).toBe(0);
    });

    test.each(["docs", "test", "chore", "build", "style", "features"])("does not release for %s alone", type => {
        prepare("0.9.0", [`${type}: maintain the project`]);
        const result = preview();
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain("No new version to release");
    });

    test.each([
        ["1.0.1", "2.0.0"],
        ["2.4.7", "3.0.0"],
    ])("breaking changes take precedence over features and patches from %s", (current, expected) => {
        prepare(current, [
            "feat: add the first method",
            "fix: first correction",
            "refactor(api)!: change the contract",
            "feat: add another method",
            "ci: update checks",
        ]);

        expect(preview().stdout.trim()).toBe(expected);
    });

    test("does not release when there are no commits since the last tag", () => {
        prepare("0.9.0", []);
        const result = preview();
        expect(result.status).toBe(1);
        expect(result.stdout + result.stderr).toContain("No new version to release");
    });

    test.each([
        ["1.0.1", "2.0.0"],
        ["2.4.7", "3.0.0"],
    ])("preserves breaking-change notes and the parsed subject from %s", (current, expected) => {
        prepare(current, ["refactor(api)!: change the sidebar contract"]);
        const result = preview("--changelog");
        expect(result.status).toBe(0);
        expect(result.stdout).toContain(`v${expected}`);
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

    test.each([
        ["1.0.1", "2.0.0"],
        ["2.4.7", "3.0.0"],
    ])("excluded breaking commits still bump %s without appearing in release notes", (current, expected) => {
        prepare(current, ["chore!: excluded tooling migration", "docs: excluded documentation"]);
        const version = preview();
        expect(version.status).toBe(0);
        expect(version.stdout.trim()).toBe(expected);

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
        ["1.0.1", "2.0.0"],
        ["2.4.7", "3.0.0"],
    ])("allows an explicitly requested major from %s without redirecting %s", (current, expected) => {
        prepare(current, ["feat: add a method"]);
        const result = preview("--release-version", "--increment=major");
        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe(expected);
    });

    test.each(["major", "premajor", "1.0.0", "1.0.0-rc.0", "1.0.0+build", "1.1.0", "2.0.0"])("rejects an incorrect first stable version %s before writes", increment => {
        prepare("0.9.0", ["feat: add a method"]);
        const result = preview("--release-version", `--increment=${increment}`);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("1.0.1");
        const files = ["package.json", "package-lock.json", "CHANGELOG.md"];
        const before = files.map(file => readFileSync(join(directory, file), "utf8"));
        expect(release(`--increment=${increment}`).status).toBe(1);
        expect(files.map(file => readFileSync(join(directory, file), "utf8"))).toEqual(before);
        expect(git("status", "--porcelain")).toBe("");
    });

    test("prepares 0.10.0 and all changes since 0.9.0 while preserving the accidental tag", () => {
        prepareRecovery();
        const accidentalTag = git("rev-parse", "v1.0.0");
        const version = preview();
        expect(version.status).toBe(0);
        expect(version.stdout.trim()).toBe("0.10.0");

        const notes = preview("--changelog");
        expect(notes.status).toBe(0);
        expect(notes.stdout).toContain("v0.10.0");
        expect(notes.stdout).toContain("add bookmarks");
        expect(notes.stdout).toContain("change the sidebar contract");
        expect(notes.stdout).toContain("correct release configuration");
        expect(notes.stdout).toContain("Early Contributor");
        expect(notes.stdout).not.toContain("chore(release)");
        expect(git("rev-parse", "v1.0.0")).toBe(accidentalTag);
    });

    test.each([
        ["fix: correct a method", "0.10.1"],
        ["feat: add a method", "0.11.0"],
        ["refactor!: change a method", "0.11.0"],
    ])("writes the recovery release and continues 0.x for %s", (message, expected) => {
        prepareRecovery();
        const accidentalTag = git("rev-parse", "v1.0.0");
        const result = release();
        expect(result.status).toBe(0);
        expect(JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version).toBe("0.10.0");
        const lock = JSON.parse(readFileSync(join(directory, "package-lock.json"), "utf8"));
        expect(lock.version).toBe("0.10.0");
        expect(lock.packages[""].version).toBe("0.10.0");
        expect(readFileSync(join(directory, "CHANGELOG.md"), "utf8")).toContain("v0.10.0");
        git("add", ".");
        git("commit", "--quiet", "-m", "chore(release): v0.10.0");
        git("tag", "v0.10.0");
        git("commit", "--quiet", "--allow-empty", "-m", message);
        const next = preview();
        expect(next.status).toBe(0);
        expect(next.stdout.trim()).toBe(expected);
        const notes = preview("--changelog");
        expect(notes.stdout).not.toContain("add bookmarks");
        expect(notes.stdout).not.toContain("change the sidebar contract");
        expect(git("rev-parse", "v1.0.0")).toBe(accidentalTag);
    });

    test("releases the explicitly requested 1.0.1 and uses major bumps for later breaking changes", () => {
        prepareRecovery();
        const previewResult = preview("--release-version", "--increment=1.0.1");
        expect(previewResult.status).toBe(0);
        expect(previewResult.stdout.trim()).toBe("1.0.1");
        const result = release("1.0.1");
        expect(result.status).toBe(0);
        expect(JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version).toBe("1.0.1");
        git("add", ".");
        git("commit", "--quiet", "-m", "chore(release): v1.0.1");
        git("tag", "v1.0.1");
        git("commit", "--quiet", "--allow-empty", "-m", "feat!: change the stable contract");
        expect(preview().stdout.trim()).toBe("2.0.0");
    });

    test("allows a release candidate for 1.0.1", () => {
        prepareRecovery();
        const result = preview("--release-version", "--increment=1.0.1-rc.0", "--preRelease=rc");
        expect(result.status).toBe(0);
        expect(result.stdout.trim()).toBe("1.0.1-rc.0");
    });

    test("the documented npm preview commands leave package files and history unchanged", () => {
        const npmCli = process.env.npm_execpath;

        if (!npmCli) {
            throw new Error("Run this test with npm test so npm_execpath identifies the npm CLI.");
        }

        prepareRecovery();
        const files = ["package.json", "package-lock.json", "CHANGELOG.md"];
        const before = files.map(file => readFileSync(join(directory, file), "utf8"));
        const head = git("rev-parse", "HEAD");
        const tags = git("tag", "--list");

        for (const script of ["release:preview", "release:notes"]) {
            // Invoke npm's JavaScript CLI directly; npm.cmd cannot be spawned without a shell on Windows.
            const result = spawnSync(process.execPath, [npmCli, "run", "--silent", script], {cwd: directory, env, encoding: "utf8", timeout: 10000});

            if (result.error || result.signal || result.status !== 0) {
                throw new Error([
                    `npm run ${script} failed`,
                    `status: ${result.status}`,
                    `signal: ${result.signal ?? "none"}`,
                    `error: ${result.error?.message ?? "none"}`,
                    `stdout:\n${result.stdout || "(empty)"}`,
                    `stderr:\n${result.stderr || "(empty)"}`,
                ].join("\n"), {cause: result.error});
            }

            expect(result.stdout).toContain("0.10.0");
        }

        expect(files.map(file => readFileSync(join(directory, file), "utf8"))).toEqual(before);
        expect(git("rev-parse", "HEAD")).toBe(head);
        expect(git("tag", "--list")).toBe(tags);
        expect(git("status", "--porcelain")).toBe("");
    });

    test.each([
        ["1.0.1", "2.0.0"],
        ["2.4.7", "3.0.0"],
    ])("writes the breaking release from %s without publishing or changing Git history", (current, expected) => {
        prepare(current, ["feat(api)!: change the contract"]);
        const head = git("rev-parse", "HEAD");
        const tags = git("tag", "--list");

        const result = spawnSync(process.execPath, [
            join(root, "node_modules/release-it/bin/release-it.js"),
            "--ci", "--no-github", "--npm.publish=false",
            "--git.commit=false", "--git.tag=false", "--git.push=false",
        ], {cwd: directory, env, encoding: "utf8", timeout: 10000});

        expect(result.error).toBeUndefined();
        expect(result.status).toBe(0);
        expect(JSON.parse(readFileSync(join(directory, "package.json"), "utf8")).version).toBe(expected);
        const lock = JSON.parse(readFileSync(join(directory, "package-lock.json"), "utf8"));
        expect(lock.version).toBe(expected);
        expect(lock.packages[""].version).toBe(expected);
        const changelog = readFileSync(join(directory, "CHANGELOG.md"), "utf8");
        expect(changelog).toContain(`v${expected}`);
        expect(git("rev-parse", "HEAD")).toBe(head);
        expect(git("tag", "--list")).toBe(tags);
    });
});
