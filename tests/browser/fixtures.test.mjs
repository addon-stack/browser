import {mkdtemp, readFile, rm} from "node:fs/promises";
import {createServer} from "node:http";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {expect, test} from "@jest/globals";

import {createNetworkFixture, writeResources} from "./fixtures.mjs";

test("writes nested JSON manifest resources and rejects paths outside fixtures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dnr-resources-"));

    try {
        const rules = [{id: 1, action: {type: "block"}}];
        await writeResources(directory, {"fixtures/nested/rules.json": rules});
        expect(JSON.parse(await readFile(join(directory, "fixtures/nested/rules.json"), "utf8"))).toEqual(rules);

        for (const path of ["../rules.json", "fixtures/../../rules.json", "manifest.json", "/tmp/rules.json"]) {
            await expect(writeResources(directory, {[path]: []})).rejects.toThrow("Invalid fixture resource path");
        }
    } finally {
        await rm(directory, {recursive: true, force: true});
    }
});

test("network oracle counts received paths, echoes headers and keeps profiles isolated", async () => {
    const fixture = createNetworkFixture();

    const server = createServer((request, response) => {
        if (!fixture(request, response)) {
            response.writeHead(404).end();
        }
    });

    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    try {
        expect(await (await fetch(`${base}/network/counts`)).json()).toEqual({});
        const response = await fetch(`${base}/network/echo?unique=1`, {headers: {"x-test": "value"}});
        expect(response.headers.get("x-fixture-response")).toBe("original");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toMatchObject({path: "/network/echo", headers: {"x-test": "value"}});
        await fetch(`${base}/network/echo?unique=2`);
        expect(await (await fetch(`${base}/network/counts`)).json()).toEqual({"/network/echo": 2});
        expect((await fetch(`${base}/other`)).status).toBe(404);
        const isolated = createNetworkFixture();
        const messages = [];
        isolated({method: "GET", url: "/network/counts"}, {setHeader() {}, end: body => messages.push(body)});
        expect(messages).toEqual(["{}"]);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
