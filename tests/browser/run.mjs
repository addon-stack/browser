import {execFile} from "node:child_process";
import {randomUUID} from "node:crypto";
import {access, mkdir, mkdtemp, readFile, writeFile} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {promisify} from "node:util";

import {build} from "tsup";

import {createManifest, help, parseOptions, scenarioIds, selectSuites, validateReport} from "./config.mjs";
import {inspectBrowser, launchChromium} from "./runners/chromium.mjs";
import {removeBrowserTemporaryDirectory} from "./runners/cleanup.mjs";
import {inspectFirefox, launchFirefox} from "./runners/firefox.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const options = parseOptions(process.argv.slice(2));

async function bundle(entry, outDir, extra = {}) {
    await build({
        config: false, entry, outDir, bundle: true, format: ["esm"], platform: "browser", target: "es2022",
        dts: false, sourcemap: false, silent: true, ...extra,
    });
}

async function runProfile(suite, profile, browserInfo, temporary) {
    const token = randomUUID();
    let resolveReport;
    let rejectReport;

    const reported = new Promise((resolveResult, rejectResult) => {
        resolveReport = resolveResult; rejectReport = rejectResult;
    });

    void reported.catch(() => undefined);
    let received = false;

    const server = createServer(async (request, response) => {
        if (request.method === "GET" && request.url === "/fixture") {
            response.setHeader("Content-Type", "text/html");
            response.end("<!doctype html><title>Browser API fixture</title>");

            return;
        }

        if (request.method !== "POST" || request.url !== `/result/${token}`) {
            response.writeHead(404).end();

            return;
        }

        try {
            if (received) {
                throw new Error("Duplicate browser report");
            }

            received = true;
            let body = "";

            for await (const chunk of request) {
                body += chunk;

                if (body.length > 1024 * 1024) {
                    throw new Error("Oversized browser report");
                }
            }

            const report = JSON.parse(body);
            validateReport(report, suite, profile, options.browser);
            response.end("ok");
            resolveReport(report);
        } catch (error) {
            response.writeHead(400).end();
            rejectReport(error);
        }
    });

    server.on("error", rejectReport);
    let browser;
    let timeout;
    const abort = new AbortController();
    const interrupt = () => abort.abort(new Error("Browser test interrupted"));
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", interrupt);

    try {
        await new Promise((resolveListen, reject) => {
            server.once("error", reject);
            server.listen(0, "127.0.0.1", resolveListen);
        });

        const base = `http://127.0.0.1:${server.address().port}`;
        const workspace = join(temporary, suite.id, profile.id);
        const extension = join(workspace, "extension");
        const browserProfile = join(workspace, "profile");
        await mkdir(extension, {recursive: true});
        await mkdir(browserProfile);
        const template = JSON.parse(await readFile(join(directory, `extension/manifest.${options.browser}.json`), "utf8"));
        await writeFile(join(extension, "manifest.json"), JSON.stringify(createManifest(template, profile, options.browser, base), null, 2));

        await bundle({background: join(directory, "extension/background.ts")}, extension, {
            format: ["iife"],
            outExtension: () => ({js: ".js"}),
            define: {__BROWSER_TEST_CONFIG__: JSON.stringify({suite: suite.id, profile: profile.id, browser: options.browser, base, token})},
        });

        const launch = options.browser === "chromium" ? launchChromium : launchFirefox;
        browser = await launch({binary: browserInfo.path, profile: browserProfile, extension});
        console.log(`Running ${suite.id}/${profile.id}: ${scenarioIds(profile, options.browser).join(", ")}`);

        const report = await Promise.race([
            reported,
            browser.closed.then(({code, signal}) => {
                throw new Error(`Browser launcher exited early (${code ?? signal})`);
            }),
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error(`Timed out after 60 seconds: ${suite.id}/${profile.id}`)), 60000);
                abort.signal.addEventListener("abort", () => reject(abort.signal.reason), {once: true});

                if (abort.signal.aborted) {
                    reject(abort.signal.reason);
                }
            }),
        ]);

        for (const result of report.results) {
            console.log(`PASS ${options.browser} ${suite.id}/${profile.id}/${result.id}`);
        }
    } catch (error) {
        throw new Error(`${error.message}\nBrowser: ${browserInfo.version} (${browserInfo.path})\n${browser?.diagnostics ?? ""}`, {cause: error});
    } finally {
        clearTimeout(timeout);
        process.removeListener("SIGINT", interrupt);
        process.removeListener("SIGTERM", interrupt);

        try {
            await browser?.stop();
        } finally {
            server.closeAllConnections();
            await new Promise(resolveClose => server.close(resolveClose));
        }
    }
}

async function main() {
    if (options.help) {
        console.log(help);

        return;
    }

    try {
        await access(join(root, "dist/index.js"));
    } catch {
        throw new Error("Built package not found. Run npm run build before test:browser.");
    }

    const temporary = await mkdtemp(join(tmpdir(), "addon-browser-integration-"));

    try {
        await promisify(execFile)(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "-p", join(directory, "tsconfig.json")], {cwd: root});
        await bundle({suites: join(directory, "api/index.ts")}, temporary, {platform: "node", outExtension: () => ({js: ".mjs"})});
        const {default: suites} = await import(pathToFileURL(join(temporary, "suites.mjs")).href);
        const selected = selectSuites(suites, options);

        if (options.list) {
            for (const suite of selected) {
                for (const profile of suite.profiles) {
                    console.log(`${suite.id}/${profile.id}: ${scenarioIds(profile, options.browser).join(", ")}`);
                }
            }

            return;
        }

        if (!options.binary) {
            throw new Error(`Missing browser executable.\n${help}`);
        }

        const inspect = options.browser === "chromium" ? inspectBrowser : inspectFirefox;
        const info = await inspect(options.binary);
        console.log(`Browser integration: ${info.version} (${info.path})`);

        for (const suite of selected) {
            for (const profile of suite.profiles) {
                await runProfile(suite, profile, info, temporary);
            }
        }
    } finally {
        await removeBrowserTemporaryDirectory(temporary);
    }
}

try {
    await main();
} catch (error) {
    console.error(error.stdout || error.stack || error);
    process.exitCode = 1;
}
