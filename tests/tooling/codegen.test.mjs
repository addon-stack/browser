import {spawnSync} from "node:child_process";
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, beforeEach, describe, expect, test} from "@jest/globals";
import {generateEvents} from "../../codegen/events/index.mjs";
import {renderGeneratedFiles} from "../../codegen/index.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const basicNamespaces = ["alarms", "audio", "commands", "context-menus", "cookies", "downloads", "history", "identity", "idle", "management", "permissions", "runtime", "tab-capture"];
const generatedNamespaces = ["action", ...basicNamespaces, "notifications", "tabs", "web-request", "windows", "web-navigation"];

describe("source generation CLI", () => {
    let directory;
    let output;
    let index;

    const run = (...args) => spawnSync(process.execPath, [join(directory, "codegen/index.mjs"), ...args], {
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

    test("check reports a missing file without creating it", () => {
        const result = run("--check");
        expect(result.status).toBe(1);
        expect(result.stderr).toContain("Run npm run generate");

        for (const namespace of generatedNamespaces) {
            expect(result.stderr).toContain(`src/api/${namespace}/events.ts`);
        }

        expect(existsSync(join(directory, "src"))).toBe(false);
    });

    test("generation is deterministic and leaves unchanged files untouched", () => {
        expect(run().status).toBe(0);
        const outputs = generatedNamespaces.map(name => `src/api/${name}/events.ts`);

        for (const path of outputs) {
            expect(readFileSync(join(directory, path), "utf8")).toBe(readFileSync(join(root, path), "utf8"));
        }

        expect(existsSync(index)).toBe(false);
        expect(existsSync(join(directory, "src/api/action/api.ts"))).toBe(false);
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

        writeFileSync(join(directory, "codegen/events/tabs.mjs"), `export default {
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
            [join(directory, "src/api/action/methods.ts"), "export const customActionMethod = () => true;\n"],
            [join(directory, "src/api/action/index.ts"), 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/notifications/index.ts"), 'export * from "./events";\nexport * from "./methods";\n'],
            [join(directory, "src/api/notifications/methods.ts"), "export const isAvailableNotifications = () => true;\n"],
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
        writeFileSync(join(directory, "codegen/events/web-request.mjs"), `export default {
    namespace: "webRequest",
    template: "unknown",
    events: {onWebRequestBeforeRequest: "onBeforeRequest"},
};\n`);

        expect(run().status).toBe(1);
        expect(existsSync(join(directory, "src"))).toBe(false);
    });
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
