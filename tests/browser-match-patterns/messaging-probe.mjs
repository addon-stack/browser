// Serialized into disposable workers/documents/frames. The same receiver is installed on context-bound fake APIs.
export function installMessagingReceiver(label, suppliedApi) {
    const api = suppliedApi ?? globalThis.chrome;

    const listener = (message, sender, respond) => {
        if (message?.probe !== "context-messaging" || message.to !== label) return;

        if (message.mode === "promise") return (async () => "from-promise")();

        if (message.mode === "promise-reject") return (async () => {
            throw new Error("probe promise rejection");
        })();

        if (message.mode === "no-argument") return respond();

        if (message.mode === "undefined-response") return respond(undefined);

        if (message.mode === "silent") return;

        if (message.mode === "hold") {
            void api.runtime.sendMessage({probe: "context-messaging", mode: "ack", label}).catch(error => console.error(error));

            return true;
        }

        if (message.mode === "relay") {
            api.runtime.sendMessage({probe: "context-messaging", to: "worker", mode: "echo", payload: message.payload}).then(respond);

            return true;
        }

        if (message.mode === "echo") respond({
            label, payload: message.payload,
            sender: {
                id: sender.id, url: sender.url, origin: sender.origin ?? null,
                frameId: sender.frameId ?? null, tabId: sender.tab?.id ?? null,
                documentId: sender.documentId ?? null, documentLifecycle: sender.documentLifecycle ?? null,
            },
        });
    };

    api.runtime.onMessage.addListener(listener);

    // executeScript cannot serialize a returned function; only in-process callers need an unsubscribe handle.
    return suppliedApi ? () => api.runtime.onMessage.removeListener(listener) : undefined;
}

// Explicit tags survive the JSON report transport: a missing property must not hide an undefined response.
export async function messageResponsesProbe(api, {namespace, tabId, label, frameId, documentId}) {
    const scenarios = [];

    for (const style of ["promise", "callback"]) {
        const responses = {style};

        for (const mode of ["echo", "promise", "promise-reject", "no-argument", "undefined-response", "silent"]) {
            const message = {probe: "context-messaging", to: label, mode, payload: "ready"};
            const args = namespace === "tabs" ? [tabId, message, {frameId, documentId}] : [message];

            try {
                const value = style === "promise" ? await api[namespace].sendMessage(...args)
                    : await new Promise((resolve, reject) => api[namespace].sendMessage(...args, result => {
                        const error = api.runtime.lastError;

                        if (error) reject(new Error(error.message));
                        else resolve(result);
                    }));

                responses[mode] = value === undefined ? {kind: "undefined"} : value === null ? {kind: "null"} : {kind: "value", value};
            } catch (error) {
                // Compare failure meaning, not Chrome's renderer prefix or the kit's API-name prefix.
                // Unexpected messages remain intact and fail the assertions below the browser probe.
                const message = error.message.replace(/^(?:runtime|tabs)\.sendMessage: /, "").replace(/^Uncaught Error: /, "");
                responses[mode] = {kind: "error", message};
            }
        }

        scenarios.push(responses);
    }

    return scenarios;
}

// Caller supplies lifecycle setup, because only the browser actually loads a document and executes its script.
export async function messagingProbe(api, {tabId, frames, createOffscreen}) {
    const report = [];

    for (const style of ["promise", "callback"]) {
        const invoke = (namespace, ...args) => {
            if (style === "promise") return api[namespace].sendMessage(...args);

            return new Promise((resolve, reject) => api[namespace].sendMessage(...args, result => {
                const error = api.runtime.lastError;

                if (error) reject(new Error(error.message));
                else resolve(result);
            }));
        };

        await createOffscreen();
        const payload = {nested: {n: 1}, when: new Date("2020-01-01T00:00:00.000Z"), omit: undefined};
        const request = {probe: "context-messaging", to: "offscreen", mode: "echo", payload};
        const result = {style, runtime: await invoke("runtime", request), frames: []};

        if (style === "promise") {
            result.responses = await messageResponsesProbe(api, {namespace: "runtime", label: "offscreen"});
            result.contentResponses = await messageResponsesProbe(api, {namespace: "tabs", label: "main", tabId, frameId: 0});
        }

        for (const frame of frames) {
            const to = frame.frameId === 0 ? "main" : "child";
            const message = {probe: "context-messaging", to, mode: "relay", payload};

            result.frames.push({
                byFrame: await invoke("tabs", tabId, message, {frameId: frame.frameId}),
                byDocument: await invoke("tabs", tabId, message, {documentId: frame.documentId}),
            });
        }

        try {
            await invoke("tabs", tabId, request, {frameId: 999999});
            result.missingFrame = false;
        } catch (error) {
            result.missingFrame = /Receiving end does not exist/.test(error.message);
        }

        let ready;

        const held = new Promise(resolve => {
            ready = resolve;
        });

        const ack = (message, _sender, respond) => {
            if (message?.probe !== "context-messaging" || message.mode !== "ack") return;

            respond("ack");
            ready();
        };

        api.runtime.onMessage.addListener(ack);

        try {
            // Attach rejection handling before removing a real or modeled receiving document.
            const pending = invoke("runtime", {...request, mode: "hold"}).then(() => false, error =>
                /message (?:port|channel) closed|channel closed before/.test(error.message)
            );

            await held;
            await api.offscreen.closeDocument();
            result.closedChannel = await pending;
        } finally {
            api.runtime.onMessage.removeListener(ack);
        }

        report.push(result);
    }

    return report;
}
