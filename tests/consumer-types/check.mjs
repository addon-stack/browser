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
const npmOptions = {
    env: {...process.env, npm_config_cache: join(temporaryDirectory, "npm-cache")},
    shell: process.platform === "win32",
};

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
    assert.deepEqual(installedPackage.exports?.["./testing"], {
        types: "./dist/testing/index.d.ts",
        import: "./dist/testing/index.js",
        require: "./dist/testing/index.cjs",
    });

    const declarations = readFileSync(join(installedPackageDirectory, installedPackage.types), "utf8");
    const testingDeclarations = readFileSync(join(installedPackageDirectory, "dist/testing/index.d.ts"), "utf8");

    assert.match(declarations, /^\/\/\/ <reference types="chrome" \/>/);
    assert.match(testingDeclarations, /^\/\/\/ <reference types="chrome" \/>/);
    assert.match(testingDeclarations, /^\/\/\/ <reference path="\.\.\/api\.d\.ts" \/>/m);
    for (const file of ["dist/testing/index.js", "dist/testing/index.cjs"]) {
        assert.equal(existsSync(join(installedPackageDirectory, file)), true, `${file} is missing from the tarball`);
    }
    for (const file of ["dist/testing/index.js.map", "dist/testing/index.cjs.map"]) {
        assert.equal(existsSync(join(installedPackageDirectory, file)), false, `${file} must not be in the tarball`);
    }
    assert.equal(existsSync(join(consumerDirectory, "node_modules/@types/chrome")), true);

    execFileSync(
        process.execPath,
        [join(packageDirectory, "node_modules/typescript/bin/tsc"), "--project", consumerDirectory],
        {
            stdio: "inherit",
        }
    );
    execFileSync(process.execPath, [join(consumerDirectory, "esm.mjs")], {cwd: consumerDirectory, stdio: "inherit"});
    execFileSync(process.execPath, [join(consumerDirectory, "cjs.cjs")], {cwd: consumerDirectory, stdio: "inherit"});
} finally {
    rmSync(temporaryDirectory, {force: true, recursive: true});
}
