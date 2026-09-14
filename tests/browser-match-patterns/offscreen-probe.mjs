// Self-contained: run unchanged inside a disposable MV3 worker and against the built test harness.
export async function offscreenProbe(api) {
    const hasDocument = typeof api.offscreen.hasDocument === "function";
    const scenarios = [];

    for (const style of ["promise", "callback"]) {
        const invoke = (name, ...args) => {
            if (style === "promise") return api.offscreen[name](...args);

            return new Promise((resolve, reject) => api.offscreen[name](...args, result => {
                const error = api.runtime.lastError;

                if (error) reject(new Error(error.message));
                else resolve(result);
            }));
        };

        const fails = async work => {
            try {
                await work();

                return false;
            } catch (error) {
                return typeof error.message === "string" && error.message.length > 0 && api.runtime.lastError === undefined;
            }
        };

        const parameters = {url: "offscreen.html", reasons: ["DOM_PARSER"], justification: "Offscreen lifecycle smoke"};
        const result = {style};
        result.before = hasDocument ? await invoke("hasDocument") : null;
        result.absentCloseFails = await fails(() => invoke("closeDocument"));
        await invoke("createDocument", parameters);

        try {
            result.created = hasDocument ? await invoke("hasDocument") : null;
            const contexts = await api.runtime.getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"]});

            result.contexts = contexts.map(context => ({
                contextType: context.contextType,
                tabId: context.tabId,
                frameId: context.frameId,
                windowId: context.windowId,
                incognito: context.incognito,
                hasContextId: typeof context.contextId === "string" && context.contextId.length > 0,
                hasDocumentId: typeof context.documentId === "string" && context.documentId.length > 0,
                documentUrlMatches: context.documentUrl === api.runtime.getURL("offscreen.html"),
                documentOriginMatches: context.documentOrigin === api.runtime.getURL("").replace(/\/$/, ""),
            }));

            result.duplicateFails = await fails(() => invoke("createDocument", parameters));
        } finally {
            await invoke("closeDocument");
        }

        result.after = hasDocument ? await invoke("hasDocument") : null;
        result.remaining = (await api.runtime.getContexts({contextTypes: ["OFFSCREEN_DOCUMENT"]})).length;
        scenarios.push(result);
    }

    return {hasDocument, scenarios};
}
