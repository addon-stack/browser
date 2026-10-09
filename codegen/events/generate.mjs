import assert from "node:assert/strict";

import {renderActionEvent} from "./templates/action.mjs";
import {renderBasicEvent} from "./templates/basic.mjs";
import {renderWebNavigationEvent} from "./templates/web-navigation.mjs";
import {renderWebRequestEvent} from "./templates/web-request.mjs";
import {renderWindowsEvent} from "./templates/windows.mjs";

const templates = new Map([
    ["action", renderActionEvent],
    ["basic", renderBasicEvent],
    ["web-navigation", renderWebNavigationEvent],
    ["web-request", renderWebRequestEvent],
    ["windows", renderWindowsEvent],
]);

export function generateEvents(specs) {
    return specs.map(({namespace, template = "basic", events}) => {
        assert.match(namespace, /^[a-z][a-zA-Z0-9]*$/, "Invalid event namespace");
        assert.ok(templates.has(template), `Unknown event template: ${template}`);
        assert.ok(events && typeof events === "object" && !Array.isArray(events), "Expected an events object");
        assert.ok(Object.keys(events).length > 0, "Expected at least one event");
        const name = namespace.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        const functions = [];
        const utilities = new Set();
        const imports = new Set();
        let usesBrowser = false;

        for (const [exportName, description] of Object.entries(events)) {
            assert.match(exportName, /^on[A-Z][a-zA-Z0-9]*$/, `Invalid event export: ${exportName}`);

            assert.ok(
                typeof description === "string" || (description && typeof description === "object" && !Array.isArray(description)),
                `Invalid event description for ${exportName}`
            );

            const {event: eventName, template: templateName = template, callbackType} = typeof description === "string"
                ? {event: description}
                : description;

            assert.match(eventName, /^on[A-Z][a-zA-Z0-9]*$/, `Invalid event name for ${exportName}`);
            const render = templates.get(templateName);
            assert.ok(render, `Unknown event template: ${templateName}`);

            if (callbackType !== undefined) {
                assert.ok(templateName === "basic" && typeof callbackType === "string" && callbackType.trim(), `Invalid callback type for ${exportName}`);
            }

            const result = render({namespace, exportName, eventName, callbackType});
            usesBrowser ||= result.usesBrowser === true;

            for (const utility of result.utilities) {
                utilities.add(utility);
            }

            for (const statement of result.imports ?? []) {
                imports.add(statement);
            }

            functions.push(result.source);
        }

        const sortedImports = [...imports].sort();
        const typesImports = sortedImports.filter(statement => / from "\.{1,2}\/(?:[^"]*\/)?types(?:\.[cm]?[jt]s)?";$/.test(statement));
        const regularImports = sortedImports.filter(statement => !typesImports.includes(statement));

        return {
            namespace,
            name: "events",
            exports: Object.keys(events),
            source: [
                `// Edit codegen/events/apis/${name}.mjs and run npm run generate.`,
                "",
                ...(usesBrowser ? ['import {browser} from "../browser";'] : []),
                `import {${[...utilities].sort().join(", ")}} from "../utils";`,
                ...regularImports,
                ...(typesImports.length ? ["", ...typesImports] : []),
                "",
                functions.join("\n\n"),
                "",
            ].join("\n"),
        };
    });
}
