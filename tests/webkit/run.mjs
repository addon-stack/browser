import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {promisify} from "node:util";

import {build} from "tsup";

const run = promisify(execFile);
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
assert.equal(process.platform, "darwin", "System WebKit tests require macOS 15.4+ and the Xcode Command Line Tools");
const temporary = await mkdtemp(join(tmpdir(), "addon-browser-webkit-"));

try {
    await run(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", join(directory, "tsconfig.json")]);
    const extension = join(temporary, "extension");
    await mkdir(extension);

    await writeFile(join(extension, "manifest.json"), JSON.stringify({
        manifest_version: 3, name: "Isolated WebKit contract tests", version: "0.0.1", action: {},
        permissions: ["alarms", "tabs", "cookies", "contextMenus", "scripting", "declarativeNetRequest", "webRequest"],
        host_permissions: ["https://example.test/*"],
    }));

    await writeFile(join(extension, "probe.html"), '<!doctype html><meta charset="utf-8"><script src="probe.js"></script>');

    await build({
        config: false, entry: {probe: join(directory, "probe.ts")}, outDir: extension,
        bundle: true, format: ["iife"], platform: "browser", target: "es2022",
        dts: false, sourcemap: false, silent: true, outExtension: () => ({js: ".js"}),
    });

    const host = join(temporary, "host");
    await run("xcrun", ["clang", "-fobjc-arc", "-framework", "Cocoa", "-framework", "WebKit", join(directory, "host.m"), "-o", host]);

    const [{stdout: macOS}, {stdout: webKit}, {stdout}] = await Promise.all([
        run("sw_vers", ["-productVersion"]),
        run("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleVersion", "/System/Library/Frameworks/WebKit.framework/Resources/Info.plist"]),
        run(host, [extension], {timeout: 50000, maxBuffer: 4 * 1024 * 1024}),
    ]);

    const {results} = JSON.parse(stdout);
    assert.deepEqual(results.map(result => result.id), ["alarms", "action", "absent-results", "capabilities", "callback-errors"]);
    console.log(`System WebKit ${webKit.trim()} on macOS ${macOS.trim()}`);

    for (const result of results) {
        assert.equal(result.status, "passed", `${result.id}: ${result.error ?? "did not pass"}`);
        console.log(`PASS webkit ${result.id}`);
    }
} finally {
    await rm(temporary, {recursive: true, force: true});
}
