import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = join(fixtureDirectory, "../..");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "addon-core-browser-consumer-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npmOptions = {shell: process.platform === "win32"};

try {
    const [{filename}] = JSON.parse(
        execFileSync(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", temporaryDirectory], {
            ...npmOptions,
            cwd: packageDirectory,
            encoding: "utf8",
        })
    );
    const archive = join(temporaryDirectory, filename);
    const consumerDirectory = join(temporaryDirectory, "consumer");

    cpSync(fixtureDirectory, consumerDirectory, {recursive: true});
    writeFileSync(join(consumerDirectory, "package.json"), '{"private":true,"type":"module"}\n');
    execFileSync(npm, ["install", "--ignore-scripts", "--no-package-lock", "--no-save", archive], {
        ...npmOptions,
        cwd: consumerDirectory,
        stdio: "inherit",
    });

    const installedPackageDirectory = join(consumerDirectory, "node_modules/@addon-core/browser");
    const installedPackage = JSON.parse(readFileSync(join(installedPackageDirectory, "package.json"), "utf8"));

    assert.equal(installedPackage.dependencies?.["@types/chrome"], "^0.2.2");
    assert.equal(installedPackage.peerDependencies?.["@types/chrome"], undefined);
    assert.equal(installedPackage.types, "dist/index.d.ts");

    const declarations = readFileSync(join(installedPackageDirectory, installedPackage.types), "utf8");

    assert.match(declarations, /^\/\/\/ <reference types="chrome" \/>/);
    assert.equal(existsSync(join(consumerDirectory, "node_modules/@types/chrome")), true);

    execFileSync(
        process.execPath,
        [join(packageDirectory, "node_modules/typescript/bin/tsc"), "--project", consumerDirectory],
        {
            stdio: "inherit",
        }
    );
} finally {
    rmSync(temporaryDirectory, {force: true, recursive: true});
}
