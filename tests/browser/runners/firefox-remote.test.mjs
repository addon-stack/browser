import {createServer} from "node:net";

import {describe, expect, jest, test} from "@jest/globals";

import {installTemporaryExtension} from "./firefox-remote.mjs";

async function withDebugger(respond, run) {
    const sockets = new Set();
    const requests = [];

    const server = createServer(socket => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.on("error", () => undefined);

        const send = message => {
            const json = JSON.stringify(message);
            const packet = Buffer.from(`${Buffer.byteLength(json)}:${json}`);
            // Deliberately fragment framing and UTF-8 JSON over multiple writes.
            socket.write(packet.subarray(0, 1));
            socket.write(packet.subarray(1, 12));
            socket.write(packet.subarray(12));
        };

        send({from: "root", applicationType: "browser"});
        let buffer = Buffer.alloc(0);

        socket.on("data", chunk => {
            buffer = Buffer.concat([buffer, chunk]);

            while (buffer.includes(58)) {
                const separator = buffer.indexOf(58);
                const length = Number(buffer.subarray(0, separator).toString());

                if (buffer.length < separator + 1 + length) {
                    break;
                }

                const message = JSON.parse(buffer.subarray(separator + 1, separator + 1 + length).toString());
                buffer = buffer.subarray(separator + 1 + length);
                requests.push(message);
                respond(message, send, socket);
            }
        });
    });

    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));

    try {
        await run(server.address().port, requests);
    } finally {
        for (const socket of sockets) {
            socket.destroy();
        }

        await new Promise(resolve => server.close(resolve));
    }
}

function respondToStartup(request, send, ready = true) {
    if (request.type === "getProcess") {
        send({from: "root", processDescriptor: {actor: "process-test"}});
    } else if (request.type === "getTarget") {
        send({from: "process-test", process: {consoleActor: "console-test"}});
    } else if (request.type === "evaluateJSAsync") {
        send({from: "console-test", resultID: "ready-check"});
        send({from: "console-test", type: "evaluationResult", resultID: "stale", result: true});
        send({from: "console-test", type: "evaluationResult", resultID: "ready-check", result: ready});
    } else {
        return false;
    }

    return true;
}

describe("Firefox temporary extension installation", () => {
    test("uses the advertised actor, preserves Unicode paths and ignores unsolicited events", async () => {
        let checks = 0;

        await withDebugger((request, send) => {
            send({from: "root", type: "addonListChanged"});

            if (request.type === "evaluateJSAsync") {
                checks++;
            }

            if (request.type === "getRoot") {
                send({from: "root", addonsActor: "addons-test"});
            } else if (!respondToStartup(request, send, checks >= 2)) {
                expect(checks).toBe(2);
                send({from: "addons-test", addon: {id: "тест@example.test"}});
            }
        }, async (port, requests) => {
            await installTemporaryExtension(port, "/tmp/расширение");

            expect(requests).toEqual([
                {to: "root", type: "getRoot"},
                {to: "root", type: "getProcess", id: 0},
                {to: "process-test", type: "getTarget"},
                {to: "console-test", type: "evaluateJSAsync", text: expect.stringContaining("places-browser-init-complete")},
                {to: "console-test", type: "evaluateJSAsync", text: expect.any(String)},
                {to: "addons-test", type: "installTemporaryAddon", addonPath: "/tmp/расширение"},
            ]);
        });
    });

    test.each(["missing-actor", "install-error", "disconnect", "bad-frame"])("fails explicitly on %s", async failure => {
        await withDebugger((request, send, socket) => {
            if (failure === "disconnect") {
                socket.end();
            } else if (failure === "bad-frame") {
                socket.write("invalid:{}");
            } else if (request.type === "getRoot") {
                send({from: "root", ...(failure === "missing-actor" ? {} : {addonsActor: "addons-test"})});
            } else if (!respondToStartup(request, send)) {
                send({from: "addons-test", error: "installationFailed", message: "Invalid manifest"});
            }
        }, async port => {
            await expect(installTemporaryExtension(port, "/tmp/extension"))
                .rejects.toThrow(/addonsActor|Invalid manifest|closed|Invalid Firefox/);
        });
    });

    test.each(["exception", "not-ready"])("does not install an extension when Places is %s", async failure => {
        const now = jest.spyOn(Date, "now").mockReturnValue(0);

        try {
            await withDebugger((request, send) => {
                if (request.type === "getRoot") {
                    send({from: "root", addonsActor: "addons-test"});
                } else if (request.type === "evaluateJSAsync" && failure === "exception") {
                    send({from: "console-test", resultID: "ready-check"});
                    send({from: "console-test", type: "evaluationResult", resultID: "ready-check", hasException: true, exceptionMessage: "Startup failed"});
                } else {
                    respondToStartup(request, send, false);

                    if (request.type === "evaluateJSAsync") {
                        now.mockReturnValue(11000);
                    }
                }
            }, async (port, requests) => {
                await expect(installTemporaryExtension(port, "/tmp/extension")).rejects.toThrow(/Startup failed|initialization timed out/);
                expect(requests.some(request => request.type === "installTemporaryAddon")).toBe(false);
            });
        } finally {
            now.mockRestore();
        }
    });
});
