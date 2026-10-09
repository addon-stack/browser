import {createConnection, createServer} from "node:net";

export async function freePort() {
    const server = createServer();

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    const {port} = server.address();
    await new Promise(resolve => server.close(resolve));

    return port;
}

async function connect(port) {
    const deadline = Date.now() + 10000;

    while (true) {
        try {
            return await new Promise((resolve, reject) => {
                const socket = createConnection({host: "127.0.0.1", port});
                socket.setTimeout(1000, () => socket.destroy(new Error("Firefox debugger connection timed out")));
                socket.on("error", reject);
                socket.once("connect", () => resolve(socket));
            });
        } catch (error) {
            if (Date.now() >= deadline || error.code !== "ECONNREFUSED") {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}

// Firefox RDP uses UTF-8 byte-length-prefixed JSON. Only two sequential requests are needed:
// root.getRoot -> addonsActor.installTemporaryAddon (the same flow used by Mozilla web-ext).
async function* packets(socket) {
    let buffer = Buffer.alloc(0);

    for await (const chunk of socket) {
        buffer = Buffer.concat([buffer, chunk]);

        while (buffer.length) {
            const separator = buffer.indexOf(58);

            if (separator < 0) {
                if (buffer.length > 10) {
                    throw new Error("Invalid Firefox RDP length prefix");
                }

                break;
            }

            const prefix = buffer.subarray(0, separator).toString("ascii");
            const length = Number(prefix);

            if (!/^\d+$/.test(prefix) || length < 1 || length > 16 * 1024 * 1024) {
                throw new Error("Invalid Firefox RDP packet length");
            }

            if (buffer.length < separator + 1 + length) {
                break;
            }

            const payload = buffer.subarray(separator + 1, separator + 1 + length);
            buffer = buffer.subarray(separator + 1 + length);
            yield JSON.parse(payload.toString("utf8"));
        }
    }

    throw new Error("Firefox debugger closed before installation completed");
}

export async function installTemporaryExtension(port, addonPath) {
    const socket = await connect(port);
    socket.setTimeout(10000, () => socket.destroy(new Error("Firefox debugger request timed out")));
    const messages = packets(socket);

    try {
        const {value: greeting} = await messages.next();

        if (greeting?.from !== "root" || greeting?.applicationType !== "browser") {
            throw new Error("Unexpected Firefox debugger greeting");
        }

        const request = async (to, type, args = {}) => {
            const json = JSON.stringify({to, type, ...args});
            socket.write(`${Buffer.byteLength(json)}:${json}`);

            while (true) {
                const {value: response} = await messages.next();

                // Ignore unsolicited actor events while waiting for the matching response.
                if (response?.from !== to || response.type) {
                    continue;
                }

                if (response.error) {
                    throw new Error(`Firefox ${type}: ${response.error}: ${response.message ?? ""}`);
                }

                return response;
            }
        };

        const root = await request("root", "getRoot");

        if (!root.addonsActor) {
            throw new Error("Firefox debugger has no addonsActor");
        }

        const installed = await request(root.addonsActor, "installTemporaryAddon", {addonPath});

        if (!installed.addon?.id) {
            throw new Error("Firefox did not confirm temporary extension installation");
        }
    } finally {
        socket.destroy();
        await messages.return();
    }
}
