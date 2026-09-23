/** @jest-environment jsdom */
import {getManifest, getUrl, onMessage, sendMessage} from "../../../src/runtime";
import {executeScript} from "../../../src/scripting";
import {createBrowserHarness, createTabFixture, installBrowserGlobals} from "../../../src/testing/index";
import {createNodeScriptExecutor} from "../../../src/testing/node";

test("explicit Node executor projects jsdom data without sharing the host DOM", async () => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
    harness.contexts.documents.create({tabId: 7, url: "https://injected.test/"});
    const originalTitle = document.title;
    const before = environment();
    document.title = "Host title";
    const restore = installBrowserGlobals(harness, {environment: "preserve"});

    try {
        harness.scripting.setExecutor(createNodeScriptExecutor({globals: () => ({document: {title: document.title}})}));

        const results = await executeScript<Promise<string>>({target: {tabId: 7}, func: async () => {
            const title = document.title;
            document.title = "Guest mutation";

            return title;
        }});

        expect(results[0].result).toBe("Host title");
        expect(document.title).toBe("Host title");
        expect(environment()).toEqual(before);
        expect(() => createNodeScriptExecutor({globals: {document}})).toThrow("DOM or class instances");
    } finally {
        harness.reset();
        restore();
        document.title = originalTitle;
    }
});

test("scripting adapter works in Jest jsdom without executing code against the host DOM", async () => {
    const harness = createBrowserHarness({tabs: [createTabFixture({id: 7})]});
    harness.contexts.documents.create({tabId: 7, url: "https://injected.test/"});
    const before = [window, document, location, navigator];
    harness.scripting.setExecutor(({target}) => ({url: target.url}));
    const restore = installBrowserGlobals(harness, {environment: "preserve"});

    try {
        const results = await executeScript({target: {tabId: 7}, func: () => {
            document.title = "must not run";
        }});

        expect(results[0].result).toEqual({url: "https://injected.test/"});
        expect(document.title).not.toBe("must not run");
        [window, document, location, navigator].forEach((value, index) => expect(value).toBe(before[index]));
    } finally {
        harness.reset();
        restore();
    }
});

const environment = () => Object.fromEntries(["window", "document", "location", "navigator"].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]
));

test("preserve retains the actual DOM, URL, navigator and all property descriptors", () => {
    const harness = createBrowserHarness();
    document.body.innerHTML = '<button id="example">Click</button>';
    const button = document.querySelector("button")!;
    let clicks = 0;

    button.addEventListener("click", () => {
        clicks += 1;
    });

    const before = environment();
    const identities = [window, document, location, navigator];
    const restore = installBrowserGlobals(harness, {environment: "preserve", profile: "chrome"});

    try {
        expect(environment()).toEqual(before);
        [window, document, location, navigator].forEach((value, index) => expect(value).toBe(identities[index]));
        expect(window.document).toBe(document);
        expect(window.location).toBe(location);
        expect(window.navigator).toBe(navigator);
        expect(getManifest().name).toBe("Test Extension");
        button.click();
        expect(clicks).toBe(1);
        const inner = installBrowserGlobals(harness, {environment: "preserve", profile: "firefox"});

        try {
            expect(getUrl("")).toMatch(/^moz-extension:/);
            expect(environment()).toEqual(before);
        } finally {
            inner();
        }

        expect(getUrl("")).toMatch(/^chrome-extension:/);
    } finally {
        restore();
    }

    expect(environment()).toEqual(before);
    expect(document.querySelector("button")).toBe(button);
});

test("a simulated installation failing on jsdom's non-configurable window rolls back API globals and harness state", () => {
    const harness = createBrowserHarness();
    const context = harness.contexts.create({kind: "background"});
    const names = ["chrome", "browser", "opr", "safari", "window", "document", "location", "navigator"];
    const before = names.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
    expect(Object.getOwnPropertyDescriptor(globalThis, "window")?.configurable).toBe(false);
    expect(() => installBrowserGlobals(harness, {profile: "firefox", messageContext: context})).toThrow("Unable to install global window");
    expect(names.map(key => Object.getOwnPropertyDescriptor(globalThis, key))).toEqual(before);
    expect(harness.runtime.getURL.api("")).toMatch(/^chrome-extension:/);
    expect(harness.sidebar.flavor).toBe("sidePanel");
    const restore = installBrowserGlobals(harness, {environment: "preserve"});
    restore();
    expect(names.map(key => Object.getOwnPropertyDescriptor(globalThis, key))).toEqual(before);
});

test("context-bound real wrappers retain jsdom while globals installation changes the sender", async () => {
    const harness = createBrowserHarness();
    const page = harness.contexts.create({kind: "extensionPage"});
    const worker = harness.contexts.create({kind: "background"});
    const before = environment();
    const originalDocument = document;
    const register = installBrowserGlobals(harness, {environment: "preserve", messageContext: worker});
    const unsubscribe = onMessage((message, sender, respond) => respond({message, source: sender.url}));
    register();
    const restore = installBrowserGlobals(harness, {environment: "preserve", messageContext: page});

    try {
        await expect(sendMessage("jsdom request")).resolves.toEqual({message: "jsdom request", source: page.info.url});
        expect(environment()).toEqual(before);
        expect(document).toBe(originalDocument);
    } finally {
        unsubscribe();

        try {
            harness.reset();
        } finally {
            restore();
        }
    }

    expect(environment()).toEqual(before);
});
