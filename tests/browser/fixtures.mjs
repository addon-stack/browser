import {mkdir, writeFile} from "node:fs/promises";
import {dirname, join} from "node:path";

/** JSON resources referenced by the fixture extension's manifest. */
export async function writeResources(extension, resources = {}) {
    for (const [path, value] of Object.entries(resources)) {
        if (!/^fixtures\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.json$/.test(path)) {
            throw new Error(`Invalid fixture resource path: ${path}`);
        }

        const destination = join(extension, path);
        await mkdir(dirname(destination), {recursive: true});
        await writeFile(destination, JSON.stringify(value));
    }
}

/** Local HTTP oracle; counts only requests that actually reached the server. */
export function createNetworkFixture() {
    const counts = {};

    return (request, response) => {
        const path = new URL(request.url, "http://localhost").pathname;

        if (request.method !== "GET" || !path.startsWith("/network/")) {
            return false;
        }

        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("x-fixture-response", "original");

        if (path === "/network/counts") {
            response.end(JSON.stringify(counts));
        } else {
            counts[path] = (counts[path] ?? 0) + 1;
            response.end(JSON.stringify({path, headers: request.headers}));
        }

        return true;
    };
}
