import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parseArgs, promisify} from "node:util";

import {build} from "tsup";

import {collectWrapperMethods} from "./wrappers.mjs";

const run = promisify(execFile);
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const {values} = parseArgs({options: {"report-dir": {type: "string"}}});
const reportDirectory = resolve(root, values["report-dir"] ?? ".output/webkit");
assert.equal(process.platform, "darwin", "System WebKit tests require macOS 15.4+ and the Xcode Command Line Tools");
const temporary = await mkdtemp(join(tmpdir(), "addon-browser-webkit-"));

const manifest = {
    manifest_version: 3, name: "Isolated WebKit contract tests", version: "0.0.1", action: {},
    permissions: ["alarms", "tabs", "cookies", "contextMenus", "scripting", "declarativeNetRequest", "webRequest"],
    host_permissions: ["https://example.test/*"],
};

const report = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    status: "failed",
    host: "Standalone WKWebExtensionController; nonpersistent data stores; minimal window/tab delegates",
    requestedManifest: manifest,
    humanReview: JSON.parse(await readFile(join(directory, "review.json"), "utf8")),
};

try {
    const [{stdout: macOS}, {stdout: macOSBuild}, {stdout: webKit}, {stdout: revision}, {stdout: dirty}] = await Promise.all([
        run("sw_vers", ["-productVersion"]), run("sw_vers", ["-buildVersion"]),
        run("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleVersion", "/System/Library/Frameworks/WebKit.framework/Resources/Info.plist"]),
        run("git", ["rev-parse", "HEAD"], {cwd: root}), run("git", ["status", "--porcelain"], {cwd: root}),
    ]);

    report.versions = {macOS: macOS.trim(), macOSBuild: macOSBuild.trim(), webKit: webKit.trim()};
    report.source = {revision: revision.trim(), workingTreeDirty: dirty.trim() !== ""};
    const inventory = collectWrapperMethods(root);
    report.wrapperInventory = inventory;
    await run(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", join(directory, "tsconfig.json")]);
    const extension = join(temporary, "extension");
    await mkdir(extension);
    await writeFile(join(extension, "manifest.json"), JSON.stringify(manifest));
    await writeFile(join(extension, "probe.html"), '<!doctype html><meta charset="utf-8"><script src="probe.js"></script>');

    await build({
        config: false, entry: {probe: join(directory, "probe.ts")}, outDir: extension,
        bundle: true, format: ["iife"], platform: "browser", target: "es2022",
        dts: false, sourcemap: false, silent: true,
        outExtension: () => ({js: ".js"}),
        define: {__WK_WRAPPER_INVENTORY__: JSON.stringify(inventory)},
    });

    const host = join(temporary, "host");
    await run("xcrun", ["clang", "-fobjc-arc", "-framework", "Cocoa", "-framework", "WebKit", join(directory, "host.m"), "-o", host]);
    const {stdout, stderr} = await run(host, [extension], {timeout: 50000, maxBuffer: 4 * 1024 * 1024});
    Object.assign(report, JSON.parse(stdout));

    if (stderr.trim()) {
        report.hostDiagnostics = stderr.trim();
    }

    assert.deepEqual(report.results.map(result => result.id), ["alarms", "action", "absent-results", "capabilities", "callback-errors"]);
    assert.ok(Array.isArray(report.grantedPermissions?.permissions), "Granted permissions must be recorded");
    assert.ok(Array.isArray(report.grantedPermissions?.origins), "Granted host permissions must be recorded");
    console.log(`System WebKit ${report.versions.webKit} on macOS ${report.versions.macOS}`);

    for (const result of report.results) {
        assert.equal(result.status, "passed", `${result.id}: ${result.error ?? "did not pass"}`);
        console.log(`PASS webkit ${result.id}`);
    }

    report.status = "passed";
} catch (error) {
    report.failure = String(error);

    if (error.stderr) {
        report.hostDiagnostics = error.stderr;
    }

    throw error;
} finally {
    await mkdir(reportDirectory, {recursive: true});
    await writeFile(join(reportDirectory, "report.json"), JSON.stringify(report, null, 2) + "\n");

    const lines = ["# System WebKit observations", "", `Captured: ${report.capturedAt}`, `Status: ${report.status}`,
        `Versions: ${JSON.stringify(report.versions ?? {})}`, `Source: ${JSON.stringify(report.source ?? {})}`,
        `Requested permissions: ${JSON.stringify(manifest.permissions)}`,
        `Requested host permissions: ${JSON.stringify(manifest.host_permissions)}`,
        `Granted permissions/origins: ${JSON.stringify(report.grantedPermissions ?? "not recorded")}`,
        "", report.host, "", "## Runtime scenarios", "",
        ...(report.results ?? []).map(result => `- ${result.id}: ${result.status}${result.error ? ` — ${result.error}` : ""}`),
        "", "## Observed presence", "", "Absence is not attributed to a browser limitation; permissions, manifest, host and build can affect exposure.", "",
        "| Namespace | Method | State | Wrapper references |", "| --- | --- | --- | --- |",
        ...(report.observations ?? []).flatMap(row => row.methods.map(method =>
            `| ${row.namespace} | ${method.name} | ${method.state} | ${method.wrapperReferences.map(ref => `${ref.file}:${ref.line} (${ref.wrapper})`).join(", ")} |`)),
        "", "## Human-reviewed findings", "", `Reviewed: ${report.humanReview.reviewedOn}. These sections are static findings, not automatic deductions.`,
        ...["incorrectCallsAdapted", "sourceOnly", "remainingGaps"].flatMap(section => ["", `### ${section}`, "", ...report.humanReview[section].map(value => `- ${value}`)]),
        ...(report.failure ? ["", `Failure: ${report.failure}`] : []), "",
    ];

    await writeFile(join(reportDirectory, "report.md"), lines.join("\n"));
    console.log(`WebKit report: ${reportDirectory}`);
    await rm(temporary, {recursive: true, force: true});
}
