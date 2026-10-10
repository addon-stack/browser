import {browser, getAuthToken, isAvailableIdentity} from "../../../../dist/index.js";
import {assert} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "auth-token-without-permission",
    browsers: ["chromium"],
    async run() {
        const native = browser();
        assert(!native.runtime.getManifest().permissions?.includes("identity"), "This profile must not grant identity");
        assert(native.identity === undefined, "Chrome must not expose identity without permission");
        assert(!isAvailableIdentity(), "identity must be unavailable without permission");

        for (const details of [undefined, {interactive: false}]) {
            // Missing API access must become a rejection, not escape synchronously.
            const pending = getAuthToken(details);
            assert(pending instanceof Promise, "getAuthToken must return a Promise without identity permission");
            const error: unknown = await pending.then(() => undefined, error => error);
            assert(error instanceof Error, "getAuthToken must reject without identity permission");
        }
    },
} satisfies BrowserScenario;
