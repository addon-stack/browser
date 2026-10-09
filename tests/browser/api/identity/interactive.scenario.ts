import {browser, getIdentityRedirectUrl, launchWebAuthFlow} from "../../../../dist/index.js";
import {assert, waitFor} from "../../extension/assert";
import {authStatus, authUrl} from "./fixture";

import type {BrowserScenario} from "../../types";

export default {
    id: "web-auth-interactive",
    async run({base}) {
        const native = browser();

        for (const cancel of [false, true]) {
            const flow = cancel ? "interactive-cancel" : "interactive-approve";
            const existing = new Set((await native.windows.getAll()).map(window => window.id));
            const redirect = getIdentityRedirectUrl("callback");
            const target = new URL(redirect);
            target.searchParams.set("code", "interactive-code");
            let settled = false;

            const pending = launchWebAuthFlow({url: authUrl(base, "interactive", flow, redirect, target.href), interactive: true})
                .then(value => ({ok: true as const, value}), error => ({ok: false as const, error}))
                .then(result => {
                    settled = true;

                    return result;
                });

            try {
                // This request is sent by script in the native auth window, not by the extension.
                await waitFor(() => authStatus(base, flow), status => status.polls > 0, "interactive authorization page");
                assert(!settled, "Auth flow must wait for approval or cancellation");

                const windows = await waitFor(() => native.windows.getAll(),
                    windows => windows.some(window => window.id !== undefined && !existing.has(window.id)), "native auth window");

                const authWindow = windows.find(window => window.id !== undefined && !existing.has(window.id))!;

                if (cancel) {
                    await native.windows.remove(authWindow.id!);
                } else {
                    const response = await fetch(authUrl(base, "approve", flow), {method: "POST"});
                    assert(response.ok, "Local provider approval failed");
                }

                const result = await pending;

                if (cancel) {
                    assert(!result.ok && result.error !== undefined, "Closing the native auth window must reject");
                } else {
                    assert(result.ok && result.value === target.href, "Interactive flow lost its redirect URL");
                }

                await waitFor(() => native.windows.getAll(),
                    windows => !windows.some(window => window.id === authWindow.id), "auth window cleanup");
            } finally {
                for (const window of await native.windows.getAll()) {
                    if (window.id !== undefined && !existing.has(window.id)) {
                        await native.windows.remove(window.id);
                    }
                }
            }
        }
    },
} satisfies BrowserScenario;
