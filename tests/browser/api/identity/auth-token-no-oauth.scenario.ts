import {browser, getAuthToken, isAvailableIdentity} from "../../../../dist/index.js";
import {assert} from "../../extension/assert";

import type {BrowserScenario} from "../../types";

export default {
    id: "auth-token-without-oauth",
    browsers: ["chromium"],
    async run() {
        const native = browser();
        const manifest = native.runtime.getManifest();
        assert(manifest.permissions?.includes("identity"), "This profile must grant identity");
        assert(manifest.oauth2 === undefined, "This profile must not configure OAuth");
        assert(isAvailableIdentity(), "identity must be available in the granted profile");

        // Capture the native callback error while lastError is still in scope.
        const failure = await new Promise<{message?: string; token?: string}>(resolve => {
            native.identity.getAuthToken({interactive: false}, token => {
                resolve({message: native.runtime.lastError?.message, token});
            });
        });

        assert(failure.message, "Native getAuthToken must report an error without OAuth configuration");
        assert(failure.token === undefined, "Native getAuthToken must not issue a token without OAuth configuration");

        for (const details of [undefined, {interactive: false}]) {
            // A synchronous throw fails this scenario before the rejection check.
            const pending = getAuthToken(details);
            assert(pending instanceof Promise, "getAuthToken must return a Promise");
            const error: unknown = await pending.then(() => undefined, error => error);
            assert(error instanceof Error, "getAuthToken must reject without OAuth configuration");
            assert(error.message === failure.message, `Native lastError message was lost: ${error.message}`);
        }
    },
} satisfies BrowserScenario;
