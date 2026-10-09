import {spawnSync} from "node:child_process";
import {cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";

import availabilityApis from "../../codegen/availability/apis.mjs";
import {generateAvailability} from "../../codegen/availability/generate.mjs";
import {generateEvents} from "../../codegen/events/generate.mjs";
import {renderGeneratedFiles} from "../../codegen/generate.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const basicNamespaces = ["alarms", "audio", "commands", "context-menus", "cookies", "downloads", "history", "identity", "idle", "management", "permissions", "runtime", "tab-capture"];
const generatedNamespaces = ["action", ...basicNamespaces, "notifications", "tabs", "web-request", "windows", "web-navigation"];
const availabilityNamespaces = [...generatedNamespaces, "browsing-data", "document-scan", "extension", "i18n", "offscreen", "scripting", "sidebar", "user-scripts"];

const generatedOutputs = [
    ...generatedNamespaces.map(name => `src/api/${name}/events.ts`),
    ...availabilityNamespaces.map(name => `src/api/${name}/availability.ts`),
];

describe("source generation CLI", () => {
    let directory;
    let output;
    let index;

    const run = (...args) => spawnSync(process.execPath, [join(directory, "codegen/generate.mjs"), ...args], {
        cwd: tmpdir(),
        encoding: "utf8",
        timeout: 10000,
    });

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), "browser-event-codegen-"));
        output = join(directory, "src/api/tabs/events.ts");
        index = join(directory, "src/api/tabs/index.ts");
        cpSync(join(root, "codegen"), join(directory, "codegen"), {recursive: true});
    });

    afterEach(() => {
        rmSync(directory, {recursive: true, force: true});
    });

    test.each([
        ["events", generatedNamespaces],
        ["availability", availabilityNamespaces],
    ])("the %s entrypoint returns configured sources without writing files", (section, namespaces) => {
        const url = pathToFileURL(join(directory, `codegen/${section}/index.mjs`)).href;

        const result = spawnSync(process.execPath, ["--input-type=module", "--eval", `
            import generate from ${JSON.stringify(url)};
            const modules = generate();
            console.log(JSON.stringify(modules));
        `], {cwd: directory, encoding: "utf8", timeout: 10000});

        expect(result.stderr).toBe("");
        expect(result.status).toBe(0);
        const modules = JSON.parse(result.stdout);

        expect(modules.map(module => module.namespace.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)).sort())
            .toEqual([...namespaces].sort());

        for (const module of modules) {
            expect(module.name).toBe(section);
            expect(module.exports.length).toBeGreaterThan(0);
            expect(module.source).toContain(`export const ${module.exports[0]}`);
        }

        expect(existsSync(join(directory, "src"))).toBe(false);
    });

    test("check reports a missing file without creating it", () => {
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Run npm run generate");

        for (const path of generatedOutputs) {
            expect(result.stderr).toContain(path);
        }

        expect(existsSync(join(directory, "src"))).toBe(false);
    });

    test("generation is deterministic and leaves unchanged files untouched", () => {
        expect(run().status).toBe(0);
        const outputs = generatedOutputs;

        for (const path of outputs) {
            expect(readFileSync(join(directory, path), "utf8")).toBe(readFileSync(join(root, path), "utf8"));
        }

        expect(existsSync(index)).toBe(false);
        expect(existsSync(join(directory, "src/api/action/api.ts"))).toBe(false);
        expect(existsSync(join(directory, "src/api/sidebar/api.ts"))).toBe(false);
        expect(existsSync(join(directory, "src/api/browser-detection"))).toBe(false);
        expect(existsSync(join(directory, "src/api/alarms/custom-events.ts"))).toBe(false);
        expect(existsSync(join(directory, "src/api/commands/custom-events.ts"))).toBe(false);
        expect(existsSync(join(directory, "src/api/tabs/generated"))).toBe(false);
        expect(existsSync(join(directory, "src/api/web-request/index.ts"))).toBe(false);
        expect(existsSync(join(directory, "src/api/windows/types.ts"))).toBe(false);
        const modifiedAt = outputs.map(path => statSync(join(directory, path)).mtimeMs);
        expect(run().status).toBe(0);
        expect(run("--check").status).toBe(0);
        expect(outputs.map(path => statSync(join(directory, path)).mtimeMs)).toEqual(modifiedAt);
    });

    test("check detects a changed description without repairing the output", () => {
        expect(run().status).toBe(0);
        const before = readFileSync(output, "utf8");

        writeFileSync(join(directory, "codegen/events/apis/tabs.mjs"), `export default {
    namespace: "tabs",
    events: {onTabChanged: "onUpdated"},
};\n`);

        expect(run("--check").status).toBe(1);
        expect(readFileSync(output, "utf8")).toBe(before);
        expect(run().status).toBe(0);
        expect(readFileSync(output, "utf8")).toContain("export const onTabChanged");
        expect(readFileSync(output, "utf8")).not.toContain("export const onTabCreated");
        expect(run("--check").status).toBe(0);
    });

    test("checks and repairs events without changing handwritten namespace files", () => {
        expect(run().status).toBe(0);
        const expected = readFileSync(output, "utf8");

        const handwritten = [
            ...basicNamespaces.flatMap(namespace => [
                [join(directory, `src/api/${namespace}/index.ts`), 'export * from "./events";\nexport * from "./methods";\n'],
                [join(directory, `src/api/${namespace}/methods.ts`), "export const customMethod = () => true;\n"],
            ]),
            [join(directory, "src/api/action/api.ts"), "export const action = () => nativeAction;\n"],
            [join(directory, "src/api/sidebar/api.ts"), "export const sidePanel = () => nativeSidePanel;\n"],
            [join(directory, "src/api/sidebar/methods.ts"), "export const customSidebarMethod = () => true;\n"],
            [join(directory, "src/api/action/methods.ts"), "export const customActionMethod = () => true;\n"],
            [join(directory, "src/api/action/index.ts"), 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/notifications/index.ts"), 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/notifications/methods.ts"), "export const clearAllNotifications = () => true;\n"],
            [index, 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/tabs/methods.ts"), "export const customMethod = () => true;\n"],
            [join(directory, "src/api/web-request/index.ts"), 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/web-request/methods.ts"), "export const customRequestMethod = () => true;\n"],
            [join(directory, "src/api/windows/index.ts"), 'export * from "./events";\nexport * from "./methods";\nexport type {WindowEventFilter} from "./types";\n'],
            [join(directory, "src/api/windows/methods.ts"), "export const customWindowMethod = () => true;\n"],
            [join(directory, "src/api/windows/types.ts"), "export interface WindowEventFilter {windowTypes: string[]}\n"],
            [join(directory, "src/api/web-navigation/index.ts"), 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/web-navigation/methods.ts"), "export const customNavigationMethod = () => true;\n"],
        ].map(([path, source]) => {
            writeFileSync(path, source);

            return {path, source, modifiedAt: statSync(path).mtimeMs};
        });

        expect(run("--check").status).toBe(0);

        const changed = expected + "// Out of date\n";
        writeFileSync(output, changed);
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("src/api/tabs/events.ts");
        expect(readFileSync(output, "utf8")).toBe(changed);
        expect(run().status).toBe(0);
        expect(readFileSync(output, "utf8")).toBe(expected);

        for (const {path, source, modifiedAt} of handwritten) {
            expect(readFileSync(path, "utf8")).toBe(source);
            expect(statSync(path).mtimeMs).toBe(modifiedAt);
        }

        expect(run("--check").status).toBe(0);
    });

    test("generation does not recreate a missing namespace index", () => {
        expect(run().status).toBe(0);
        writeFileSync(index, 'export * from "./events";\n');
        rmSync(index);
        expect(run("--check").status).toBe(0);
        expect(run().status).toBe(0);
        expect(existsSync(index)).toBe(false);
    });

    test.each(["alarms", "commands"])("regenerates %s events without overwriting handwritten wrappers or their exports", namespace => {
        expect(run().status).toBe(0);
        const events = join(directory, `src/api/${namespace}/events.ts`);
        const expected = readFileSync(events, "utf8");

        const handwritten = ["custom-events.ts", "index.ts", "methods.ts"].map(name => {
            const path = join(directory, `src/api/${namespace}`, name);
            const source = readFileSync(join(root, `src/api/${namespace}`, name), "utf8");
            writeFileSync(path, source);

            return {path, source, modifiedAt: statSync(path).mtimeMs};
        });

        writeFileSync(events, expected + "// Out of date\n");
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`src/api/${namespace}/events.ts`);
        expect(run().status).toBe(0);
        expect(readFileSync(events, "utf8")).toBe(expected);

        for (const {path, source, modifiedAt} of handwritten) {
            expect(readFileSync(path, "utf8")).toBe(source);
            expect(statSync(path).mtimeMs).toBe(modifiedAt);
        }

        expect(run("--check").status).toBe(0);
    });

    test("rejects an unknown option without writing files", () => {
        expect(run("--chek").status).toBe(1);
        expect(existsSync(output)).toBe(false);
    });

    test.each(["web-request", "action"])("detects %s template changes and regenerates only the affected namespace", namespace => {
        expect(run().status).toBe(0);
        const requestOutput = join(directory, `src/api/${namespace}/events.ts`);
        const before = readFileSync(requestOutput, "utf8");
        const tabsModifiedAt = statSync(output).mtimeMs;
        const template = join(directory, `codegen/events/templates/${namespace}.mjs`);
        writeFileSync(template, readFileSync(template, "utf8").replace("export const", "// Template changed\nexport const"));
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain(`src/api/${namespace}/events.ts`);
        expect(result.stderr).not.toContain("src/api/tabs/events.ts");
        expect(readFileSync(requestOutput, "utf8")).toBe(before);
        expect(run().status).toBe(0);
        expect(readFileSync(requestOutput, "utf8")).toContain("// Template changed");
        expect(statSync(output).mtimeMs).toBe(tabsModifiedAt);
        expect(run("--check").status).toBe(0);
    });

    test("rejects an unknown template before writing any namespace", () => {
        writeFileSync(join(directory, "codegen/events/apis/web-request.mjs"), `export default {
    namespace: "webRequest",
    template: "unknown",
    events: {onWebRequestBeforeRequest: "onBeforeRequest"},
};\n`);

        expect(run().status).toBe(1);
        expect(existsSync(join(directory, "src"))).toBe(false);
    });

    test("detects and repairs a stale availability file without rewriting events", () => {
        expect(run().status).toBe(0);
        const path = join(directory, "src/api/tabs/availability.ts");
        const expected = readFileSync(path, "utf8");
        const eventsModifiedAt = statSync(output).mtimeMs;
        writeFileSync(path, expected + "// Stale availability\n");
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("src/api/tabs/availability.ts");
        expect(result.stderr).not.toContain("src/api/tabs/events.ts");
        expect(readFileSync(path, "utf8")).toContain("// Stale availability");
        expect(run().status).toBe(0);
        expect(readFileSync(path, "utf8")).toBe(expected);
        expect(statSync(output).mtimeMs).toBe(eventsModifiedAt);
    });

    test("detects availability template changes without affecting events or specialized checks", () => {
        expect(run().status).toBe(0);
        const template = join(directory, "codegen/availability/templates/basic.mjs");
        writeFileSync(template, readFileSync(template, "utf8").replace("browser().", "/* changed */ browser()."));
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("src/api/tabs/availability.ts");
        expect(result.stderr).not.toContain("src/api/action/availability.ts");
        expect(result.stderr).not.toContain("src/api/tabs/events.ts");
        expect(run().status).toBe(0);
        expect(run("--check").status).toBe(0);
    });

    test.each([
        [{namespace: "tabs", template: "unknown"}],
        [{namespace: "tabs"}, {namespace: "tabs"}],
        [{namespace: "tabs", exportName: "customName"}],
    ])("rejects invalid availability descriptions before writing any sources: %j", (...specs) => {
        writeFileSync(join(directory, "codegen/availability/apis.mjs"), `export default ${JSON.stringify(specs)};\n`);
        expect(run().status).toBe(1);
        expect(existsSync(join(directory, "src"))).toBe(false);
    });
});

test("availability descriptions cover every native API directory and preserve public naming", () => {
    const nativeDirectories = readdirSync(join(root, "src/api"), {withFileTypes: true})
        .filter(entry => entry.isDirectory() && entry.name !== "browser-detection")
        .map(entry => entry.name)
        .sort();

    expect(availabilityNamespaces.sort()).toEqual(nativeDirectories);
    const files = renderGeneratedFiles(generateAvailability(availabilityApis));
    expect([...files.keys()].sort()).toEqual(nativeDirectories.map(name => `src/api/${name}/availability.ts`));

    for (const name of nativeDirectories) {
        expect(readFileSync(join(root, `src/api/${name}/index.ts`), "utf8")).toContain('export * from "./availability";');
    }
});

test.each([
    ["tabs", "isAvailableTabs"],
    ["userScripts", "isAvailableUserScripts"],
    ["webRequest", "isAvailableWebRequest"],
    ["i18n", "isAvailableI18n"],
])("derives %s availability names without losing camelCase", (namespace, expected) => {
    const [module] = generateAvailability([{namespace}]);
    expect(module.exports).toEqual([expected]);
    expect(module.source).toContain(`export const ${expected} = (): boolean`);
});

test.each([null, [], {}, {namespace: "../tabs"}, {namespace: "tabs", template: "action"}])("rejects invalid availability descriptions: %j", spec => {
    expect(() => generateAvailability([spec])).toThrow();
});

test("rejects invalid identifiers and duplicate exports before writing modules", () => {
    expect(() => generateEvents([{namespace: "../tabs", events: {onTabCreated: "onCreated"}}])).toThrow();
    expect(() => generateEvents([{namespace: "tabs", events: {onTabCreated: "onCreated()"}}])).toThrow();

    expect(() => renderGeneratedFiles(generateEvents([
        {namespace: "tabs", events: {onCreated: "onCreated"}},
        {namespace: "windows", events: {onCreated: "onCreated"}},
    ]))).toThrow("Duplicate generated export");
});

test("renders events directly in each namespace directory", () => {
    const files = renderGeneratedFiles(generateEvents([
        {namespace: "tabs", events: {onTabCreated: "onCreated"}},
        {namespace: "webRequest", template: "web-request", events: {onWebRequestCompleted: "onCompleted"}},
    ]));

    expect([...files.keys()]).toEqual(["src/api/tabs/events.ts", "src/api/web-request/events.ts"]);
    expect(files.get("src/api/tabs/events.ts")).toContain("export const onTabCreated");
    expect(files.get("src/api/web-request/events.ts")).toContain("browser().webRequest.onCompleted");
});

test("combines the default template and per-event overrides into one module", () => {
    const files = renderGeneratedFiles(generateEvents([{
        namespace: "webRequest",
        template: "web-request",
        events: {
            onWebRequestBeforeRequest: "onBeforeRequest",
            onWebRequestAuthRequired: {event: "onAuthRequired"},
            onWebRequestActionIgnored: {event: "onActionIgnored", template: "basic"},
        },
    }]));

    expect([...files.keys()]).toEqual(["src/api/web-request/events.ts"]);
    const source = files.get("src/api/web-request/events.ts");
    expect(source).toContain('import {handleListener, safeListener} from "../utils";');
    expect(source).toContain("filter: Parameters<typeof chrome.webRequest.onBeforeRequest.addListener>[1]");
    expect(source).toContain("extraInfoSpec?: Parameters<typeof chrome.webRequest.onAuthRequired.addListener>[2]");
    expect(source).toContain("return handleListener(browser().webRequest.onActionIgnored, callback)");
    expect(source).not.toContain("chrome.webRequest.onActionIgnored.addListener>[1]");
});

test.each([null, 3, [], {}, {event: "onCreated", template: "unknown"}])("rejects an invalid event description: %p", description => {
    expect(() => generateEvents([{namespace: "tabs", events: {onTabCreated: description}}])).toThrow();
});

test("rejects duplicate output paths and invalid module names", () => {
    const events = generateEvents([{namespace: "tabs", events: {onTabCreated: "onCreated"}}]);

    expect(() => renderGeneratedFiles([...events, ...events])).toThrow("Duplicate generated module");
    expect(() => renderGeneratedFiles([{namespace: "tabs", name: "../events", exports: [], source: ""}])).toThrow();

    expect(() => renderGeneratedFiles([{namespace: "tabs", name: "index", exports: [], source: ""}]))
        .toThrow("Namespace indexes are maintained manually");
});
