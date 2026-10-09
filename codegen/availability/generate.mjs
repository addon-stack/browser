import assert from "node:assert/strict";

import {renderActionAvailability} from "./templates/action.mjs";
import {renderBasicAvailability} from "./templates/basic.mjs";
import {renderSidebarAvailability} from "./templates/sidebar.mjs";

const templates = new Map([
    ["action", renderActionAvailability],
    ["basic", renderBasicAvailability],
    ["sidebar", renderSidebarAvailability],
]);

export function generateAvailability(specs) {
    return specs.map(spec => {
        assert.ok(spec && typeof spec === "object" && !Array.isArray(spec), "Expected an availability description");
        assert.ok(Object.keys(spec).every(key => key === "namespace" || key === "template" || key === "alias"), "Unknown availability description field");
        const {namespace, alias, template = "basic"} = spec;
        assert.match(namespace, /^[a-z][a-zA-Z0-9]*$/, "Invalid availability namespace");
        const render = templates.get(template);
        assert.ok(render, `Unknown availability template: ${template}`);

        if (template !== "basic") {
            assert.equal(namespace, template, `The ${template} availability template requires its own namespace`);
        }

        if (alias !== undefined) {
            assert.match(alias, /^[A-Z][a-zA-Z0-9]*$/, "Invalid availability alias");
        }

        const exportName = `isAvailable${alias ?? namespace[0].toUpperCase() + namespace.slice(1)}`;
        const {imports, expression} = render({namespace});

        return {
            namespace,
            name: "availability",
            exports: [exportName],
            source: [
                "// Edit codegen/availability/apis.mjs and run npm run generate.",
                "",
                ...imports,
                "",
                `export const ${exportName} = (): boolean => {`,
                "    try {",
                `        return Boolean(${expression});`,
                "    } catch {",
                "        return false;",
                "    }",
                "};",
                "",
            ].join("\n"),
        };
    });
}
