// Real-Chromium smoke (standalone locally; required in CI). Only an isolated temporary profile is used.
// Run after npm run build: npm run test:browser-match-patterns -- /path/to/chrome-for-testing
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createBrowserHarness, createTabFixture} from "../../dist/testing/index.js";
import {browserSmokeError, inspectBrowser} from "./launcher.mjs";

// Reject unsupported binaries before opening a server, creating a profile or waiting for extension results.
const browserInfo = await inspectBrowser(process.argv[2]);
console.log(`Browser smoke: ${browserInfo.version} (${browserInfo.path})`);
const temporary = await mkdtemp(join(tmpdir(), "browser-match-patterns-"));
const profiles = [
    {name: "wildcard", origins: ["https://*.example.com/*", "http://127.0.0.1/*"]},
    {name: "narrow", origins: ["https://shop.example.com/*", "http://127.0.0.1/*"]},
    {name: "all", origins: ["<all_urls>"]},
];
const requestedOrigins = [
    "https://example.com/*",
    "https://shop.example.com/*",
    "https://*.example.com/*",
    "http://shop.example.com/*",
    "https://other.test/*",
    "http://127.0.0.1:62778/*",
    "https://shop.example.com/ignored-path",
];
const results = new Map();
let complete;
let fail;
const finished = new Promise((resolveResult, reject) => {
    complete = resolveResult;
    fail = reject;
});
const server = createServer(async (request, response) => {
    if (request.method === "POST") {
        let body = "";
        for await (const chunk of request) body += chunk;
        try {
            const result = JSON.parse(body);
            assert.ok(
                profiles.some(profile => profile.name === result.name),
                "Unknown browser result profile"
            );
            results.set(result.name, result);
            response.end("ok");
            if (results.size === profiles.length) complete();
        } catch (error) {
            response.writeHead(400).end();
            fail(error);
        }
    } else {
        response.setHeader("Content-Type", "text/html");
        response.end("<!doctype html><title>Match-pattern smoke</title>");
    }
});

// Serialized into the disposable extension, not executed in Node or supplied by a website.
async function probe(config) {
    const report = {name: config.name};
    try {
        const tab = await chrome.tabs.create({url: `${config.base}/page?q=a+b#part`, active: false});
        const deadline = Date.now() + 10000;
        while ((await chrome.tabs.get(tab.id)).status !== "complete") {
            if (Date.now() > deadline) throw new Error("Local test tab did not load");
            await new Promise(resolveDelay => setTimeout(resolveDelay, 25));
        }
        report.tab = await chrome.tabs.get(tab.id);
        report.queries = [];
        for (const url of config.patterns) {
            const tabs = await chrome.tabs.query({url, active: false, status: "complete", discarded: false});
            report.queries.push(tabs.some(candidate => candidate.id === tab.id));
        }
        report.permissions = [];
        for (const origin of config.requestedOrigins) {
            report.permissions.push(await chrome.permissions.contains({origins: [origin]}));
        }
        await chrome.tabs.remove(tab.id);
    } catch (error) {
        report.error = String(error.stack || error);
    }
    await fetch(`${config.base}/results`, {method: "POST", body: JSON.stringify(report)});
}

let browser;
let browserExit;
let timeout;
try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;
    const patterns = [
        "http://127.0.0.1/*",
        "*://127.0.0.1/*",
        "<all_urls>",
        `${base}/page?q=a+b`,
        `${base}/page?q=*`,
        `${base}/page`,
        "https://127.0.0.1/*",
        "http://127.0.0.1:1/*",
        ["https://other.test/*", "http://127.0.0.1/*"],
    ];
    const extensions = [];
    for (const profile of profiles) {
        const directory = join(temporary, profile.name);
        await mkdir(directory);
        await writeFile(
            join(directory, "manifest.json"),
            JSON.stringify({
                manifest_version: 3,
                name: `Match smoke ${profile.name}`,
                version: "1.0.0",
                permissions: ["tabs"],
                host_permissions: profile.origins,
                background: {service_worker: "worker.js"},
            })
        );
        await writeFile(
            join(directory, "worker.js"),
            `chrome.runtime.onInstalled.addListener(() => (${probe.toString()})(${JSON.stringify({name: profile.name, base, patterns, requestedOrigins})}));`
        );
        extensions.push(directory);
    }
    browser = spawn(
        browserInfo.path,
        [
            "--headless=new",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-networking",
            "--disable-component-update",
            "--disable-sync",
            "--no-proxy-server",
            `--user-data-dir=${join(temporary, "profile")}`,
            `--disable-extensions-except=${extensions.join(",")}`,
            `--load-extension=${extensions.join(",")}`,
            "about:blank",
        ],
        {stdio: ["ignore", "ignore", "pipe"]}
    );
    let diagnostics = "";
    browser.stderr.on("data", chunk => {
        diagnostics = (diagnostics + chunk).slice(-4000);
    });
    browser.once("error", fail);
    browserExit = once(browser, "exit");
    browserExit.then(([code]) => fail(browserSmokeError(`Browser exited (${code}).`, browserInfo, diagnostics)), fail);
    timeout = setTimeout(() => {
        const missing = profiles.filter(profile => !results.has(profile.name)).map(profile => profile.name);
        fail(
            browserSmokeError(
                `Browser smoke timed out after 30 seconds; missing results: ${missing.join(", ")}.`,
                browserInfo,
                diagnostics
            )
        );
    }, 30000);
    await finished;
    let assertions = 0;
    for (const profile of profiles) {
        const result = results.get(profile.name);
        assert.equal(result.error, undefined, result.error);
        const harness = createBrowserHarness({
            tabs: [createTabFixture(result.tab)],
            permissions: {origins: profile.origins},
        });
        for (const [index, url] of patterns.entries()) {
            const tabs = await harness.chrome.tabs.query({url, active: false, status: "complete", discarded: false});
            assert.equal(
                tabs.length === 1,
                result.queries[index],
                `${profile.name}: tabs.query ${JSON.stringify(url)}`
            );
            assertions++;
        }
        for (const [index, origin] of requestedOrigins.entries()) {
            assert.equal(
                await harness.chrome.permissions.contains({origins: [origin]}),
                result.permissions[index],
                `${profile.name}: contains ${origin}`
            );
            assertions++;
        }
    }
    console.log(
        `Real Chromium smoke: ${assertions} harness/browser comparisons passed across ${profiles.length} permission profiles.`
    );
} finally {
    clearTimeout(timeout);
    if (browser && browser.exitCode === null) {
        browser.kill("SIGTERM");
        const killTimeout = setTimeout(() => browser.kill("SIGKILL"), 3000);
        await browserExit?.catch(() => undefined);
        clearTimeout(killTimeout);
    }
    server.closeAllConnections();
    await new Promise(resolveClose => server.close(resolveClose));
    await rm(temporary, {recursive: true, force: true});
}
