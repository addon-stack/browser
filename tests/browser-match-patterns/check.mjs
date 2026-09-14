// Real-Chromium smoke (standalone locally; required in CI). Only an isolated temporary profile is used.
// Run after npm run build: npm run test:browser-match-patterns -- /path/to/chrome-for-testing
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {mkdir, mkdtemp, writeFile} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createBrowserHarness, createTabFixture} from "../../dist/testing/index.js";
import {removeBrowserTemporaryDirectory} from "./cleanup.mjs";
import {browserSmokeError, inspectBrowser} from "./launcher.mjs";
import {checkMessageResponses} from "./messaging-assertions.mjs";
import {installMessagingReceiver, messageResponsesProbe, messagingProbe} from "./messaging-probe.mjs";
import {offscreenProbe} from "./offscreen-probe.mjs";
import {storageProbe} from "./storage-probe.mjs";

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
        response.end(`<!doctype html><title>Match-pattern smoke</title>${request.url.startsWith("/page") ? '<iframe src="/frame"></iframe>' : ""}`);
    }
});

// Serialized into the disposable extension, not executed in Node or supplied by a website.
async function probe(config) {
    const report = {name: config.name};

    try {
        report.storage = await storageProbe(chrome.storage);
        report.offscreen = await offscreenProbe(chrome);
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

        report.messageFrames = await chrome.scripting.executeScript({
            target: {tabId: tab.id, allFrames: true},
            func: () => ({url: globalThis.location.href}),
        });

        report.messageFrames.sort((a, b) => a.frameId - b.frameId);

        for (const frame of report.messageFrames) {
            await chrome.scripting.executeScript({target: {tabId: tab.id, frameIds: [frame.frameId]}, func: installMessagingReceiver, args: [frame.frameId === 0 ? "main" : "child"]});
        }

        const removeReceiver = installMessagingReceiver("worker", chrome);
        report.messageWorker = (await chrome.runtime.getContexts({contextTypes: ["BACKGROUND"]}))[0];

        try {
            report.messaging = await messagingProbe(chrome, {
                tabId: tab.id, frames: report.messageFrames,
                createOffscreen: () => chrome.offscreen.createDocument({url: "offscreen.html", reasons: ["WORKERS"], justification: "Messaging smoke"}),
            });
        } finally {
            removeReceiver();
        }

        await chrome.scripting.executeScript({target: {tabId: tab.id}, func: () => chrome.runtime.id});
        report.contentContexts = (await chrome.runtime.getContexts({tabIds: [tab.id]})).length;
        const extensionUrl = chrome.runtime.getURL("page.html");
        let markReady;

        const pageReady = new Promise(resolve => {
            markReady = resolve;
        });

        const readyListener = (message, sender, respond) => {
            if (message?.probe !== "extension-page-ready" || sender.url !== extensionUrl) return;

            respond("ready"); markReady(sender);
        };

        chrome.runtime.onMessage.addListener(readyListener);
        let extensionTab;

        try {
            extensionTab = await chrome.tabs.create({url: extensionUrl, active: false});
            const sender = await pageReady;
            report.extensionMessages = await messageResponsesProbe(chrome, {namespace: "tabs", tabId: extensionTab.id, label: "extension-page"});
            report.extensionTargeted = [];

            for (const target of [{frameId: sender.frameId}, {documentId: sender.documentId}]) {
                report.extensionTargeted.push(await messageResponsesProbe(chrome, {namespace: "tabs", tabId: extensionTab.id, label: "extension-page", ...target}));
            }
        } finally {
            chrome.runtime.onMessage.removeListener(readyListener);
        }

        while ((await chrome.tabs.get(extensionTab.id)).status !== "complete") {
            if (Date.now() > deadline) throw new Error("Extension context tab did not load");

            await new Promise(resolveDelay => setTimeout(resolveDelay, 25));
        }

        report.extensionTab = await chrome.tabs.get(extensionTab.id);
        report.contexts = await chrome.runtime.getContexts({});

        report.contextFilters = [
            {},
            {contextTypes: ["BACKGROUND"]},
            {contextTypes: ["TAB"]},
            {tabIds: [extensionTab.id]},
            {tabIds: [tab.id]},
            {documentUrls: [extensionUrl]},
            {contextIds: []},
            {incognito: false, contextTypes: ["BACKGROUND"], tabIds: [extensionTab.id]},
        ];

        report.contextSelections = [];

        for (const filter of report.contextFilters) {
            report.contextSelections.push((await chrome.runtime.getContexts(filter)).map(context => context.contextId).sort());
        }

        await chrome.tabs.remove(extensionTab.id);
        await chrome.tabs.remove(tab.id);
    } catch (error) {
        report.error = String(error.stack || error);
    }

    await fetch(`${config.base}/results`, {method: "POST", body: JSON.stringify(report)});
}

let browser;
let browserExit;
let timeout;
let assertions = 0;

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
                permissions: ["tabs", "scripting", "storage", "offscreen"],
                host_permissions: profile.origins,
                background: {service_worker: "worker.js"},
            })
        );

        await writeFile(
            join(directory, "worker.js"),
            `const storageProbe = ${storageProbe.toString()}; const offscreenProbe = ${offscreenProbe.toString()}; const installMessagingReceiver = ${installMessagingReceiver.toString()}; const messageResponsesProbe = ${messageResponsesProbe.toString()}; const messagingProbe = ${messagingProbe.toString()}; chrome.runtime.onInstalled.addListener(() => (${probe.toString()})(${JSON.stringify({name: profile.name, base, patterns, requestedOrigins})}));`
        );

        await writeFile(join(directory, "page.html"), '<!doctype html><title>Extension context smoke</title><script src="page.js"></script>');
        await writeFile(join(directory, "page.js"), `(${installMessagingReceiver.toString()})("extension-page"); void chrome.runtime.sendMessage({probe: "extension-page-ready"});`);
        await writeFile(join(directory, "offscreen.html"), '<!doctype html><title>Offscreen smoke</title><script src="offscreen.js"></script>');
        await writeFile(join(directory, "offscreen.js"), `(${installMessagingReceiver.toString()})("offscreen");`);

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

    for (const profile of profiles) {
        const result = results.get(profile.name);
        assert.equal(result.error, undefined, result.error);
        const promiseListeners = checkMessageResponses(result.messaging[0].responses, "offscreen");
        assert.equal(checkMessageResponses(result.messaging[0].contentResponses, "main"), promiseListeners);
        assert.equal(checkMessageResponses(result.extensionMessages, "extension-page"), promiseListeners);
        assert.equal(result.extensionTargeted.length, 2);

        for (const scenarios of result.extensionTargeted) assert.equal(checkMessageResponses(scenarios, "extension-page"), promiseListeners);

        console.log(`${profile.name}: Promise listeners=${promiseListeners}; empty replies=null; silent callback=lastError; extension-tab delivery verified.`);
        // The browser-report timeout no longer protects us after `finished` resolves. Bound the fake's probe too:
        // a missing onChanged event must fail the smoke, not hang until the CI job timeout.
        let storageTimeout;

        try {
            const actual = await Promise.race([
                storageProbe(createBrowserHarness().chrome.storage),
                new Promise((_, reject) => {
                    storageTimeout = setTimeout(() => reject(new Error("Storage harness probe did not complete; check automatic onChanged delivery.")), 5000);
                }),
            ]);

            assert.deepEqual(actual, result.storage, `${profile.name}: storage serialization, changes, selectors and bytes`);
        } finally {
            clearTimeout(storageTimeout);
        }

        assertions++;

        const offscreenHarness = createBrowserHarness();

        // Availability is browser-version-dependent; never silently pretend an absent method was compared.
        if (!result.offscreen.hasDocument) {
            offscreenHarness.capabilities.set("offscreen.hasDocument", false);
            console.log(`${profile.name}: offscreen.hasDocument unavailable in ${browserInfo.version}; lifecycle/getContexts still compared.`);
        }

        let offscreenTimeout;

        try {
            const actual = await Promise.race([
                offscreenProbe(offscreenHarness.chrome),
                new Promise((_, reject) => {
                    offscreenTimeout = setTimeout(() => reject(new Error("Offscreen harness probe did not complete; check callback/Promise settlement.")), 5000);
                }),
            ]);

            assert.deepEqual(actual, result.offscreen, `${profile.name}: offscreen lifecycle, contexts and callback/Promise errors`);
        } finally {
            clearTimeout(offscreenTimeout);
            offscreenHarness.reset();
        }

        assertions++;

        assert.equal(result.messageFrames.length, 2, "Messaging smoke must include a main document and an iframe");
        assert.deepEqual(result.messaging.map(entry => entry.style), ["promise", "callback"]);

        for (const entry of result.messaging) {
            assert.equal(entry.runtime.label, "offscreen", "Runtime request must reach the offscreen listener");
            assert.equal(entry.missingFrame, true, "Native missing-frame request must fail through the selected interface");
            assert.equal(entry.closedChannel, true, "Native offscreen closure must reject the held request");
            assert.equal(entry.frames.length, 2, "Both frames must answer");

            for (const [index, replies] of entry.frames.entries()) for (const reply of [replies.byFrame, replies.byDocument]) {
                assert.equal(reply.label, "worker", "A content-frame relay must reach the worker listener");
                assert.equal(reply.sender.frameId, result.messageFrames[index].frameId);
                assert.equal(reply.sender.documentId, result.messageFrames[index].documentId);
            }
        }

        const messagingHarness = createBrowserHarness({
            extensionId: new URL(result.messageWorker.documentUrl ?? result.messaging[0].runtime.sender.url).hostname,
            tabs: [createTabFixture(result.tab), createTabFixture(result.extensionTab)],
        });

        messagingHarness.messaging.promiseListeners = promiseListeners;

        const messageWorker = messagingHarness.contexts.create({
            kind: "background", contextId: result.messageWorker.contextId, url: result.messaging[0].runtime.sender.url,
        });

        const messageApi = messagingHarness.messaging.forContext(messageWorker).chrome;
        installMessagingReceiver("worker", messageApi);

        for (const frame of result.messageFrames) {
            const context = messagingHarness.contexts.create({
                kind: "contentScript", tabId: result.tab.id, frameId: frame.frameId,
                documentId: messagingHarness.contexts.documents.create({
                    tabId: result.tab.id, frameId: frame.frameId, documentId: frame.documentId, url: frame.result.url,
                }).documentId,
            });

            installMessagingReceiver(frame.frameId === 0 ? "main" : "child", messagingHarness.messaging.forContext(context).chrome);
        }

        let messagingTimeout;

        const compareMessaging = async () => {
            const actual = await messagingProbe(messageApi, {
                tabId: result.tab.id, frames: result.messageFrames,
                createOffscreen: async () => {
                    await messageApi.offscreen.createDocument({url: "offscreen.html", reasons: ["WORKERS"], justification: "Messaging smoke"});
                    installMessagingReceiver("offscreen", messagingHarness.messaging.forContext(messagingHarness.offscreen.context).chrome);
                },
            });

            assert.deepEqual(actual, result.messaging, `${profile.name}: context messages, frame/document addressing, sender and closure`);

            const extensionInfo = result.contexts.find(context => context.tabId === result.extensionTab.id);
            assert.ok(extensionInfo, "Extension tab must have a registered document");

            const extensionPage = messagingHarness.contexts.create({
                kind: "extensionPage", tabId: result.extensionTab.id, frameId: extensionInfo.frameId, url: extensionInfo.documentUrl,
            });

            installMessagingReceiver("extension-page", messagingHarness.messaging.forContext(extensionPage).chrome);
            const target = {namespace: "tabs", tabId: result.extensionTab.id, label: "extension-page"};
            assert.deepEqual(await messageResponsesProbe(messageApi, target), result.extensionMessages, `${profile.name}: extension-tab replies`);
            const targeted = [];

            for (const options of [{frameId: extensionPage.info.frameId}, {documentId: extensionPage.info.documentId}]) {
                targeted.push(await messageResponsesProbe(messageApi, {...target, ...options}));
            }

            assert.deepEqual(targeted, result.extensionTargeted, `${profile.name}: extension frame/document replies`);
            assertions += 2;
        };

        try {
            await Promise.race([
                compareMessaging(),
                new Promise((_, reject) => {
                    messagingTimeout = setTimeout(() => reject(new Error("Messaging harness probe did not complete; check routed channel lifecycle.")), 5000);
                }),
            ]);
        } finally {
            clearTimeout(messagingTimeout); messagingHarness.reset();
        }

        assertions++;

        const harness = createBrowserHarness({
            tabs: [createTabFixture(result.tab), createTabFixture(result.extensionTab)],
            permissions: {origins: profile.origins},
            contexts: result.contexts,
        });

        assert.equal(result.contentContexts, 0, "runtime.getContexts must not enumerate content scripts");
        assert.deepEqual(result.contexts.map(context => context.contextType).sort(), ["BACKGROUND", "TAB"]);
        harness.contexts.create({kind: "contentScript", tabId: result.tab.id, url: result.tab.url});

        for (const [index, filter] of result.contextFilters.entries()) {
            const selected = await harness.chrome.runtime.getContexts(filter);
            assert.deepEqual(selected.map(context => context.contextId).sort(), result.contextSelections[index]);
            assertions++;
        }

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
    await removeBrowserTemporaryDirectory(temporary);
}

console.log(
    `Real Chromium smoke: ${assertions} harness/browser comparisons passed across ${profiles.length} permission profiles; temporary profile removed.`
);
