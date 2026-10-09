import {browser, getIdentityRedirectUrl, launchWebAuthFlow} from "../../../../dist/index.js";
import {assert} from "../../extension/assert";
import {authStatus, authUrl} from "./fixture";

import type {BrowserScenario} from "../../types";

export default {
    id: "web-auth-redirect",
    async run({base}) {
        const redirect = getIdentityRedirectUrl("callback");
        assert(redirect === browser().identity.getRedirectURL("callback"), "Redirect URL differs from the native API");

        for (const [flow, interactive] of [["silent-default", undefined], ["silent-false", false], ["interactive-redirect", true]] as const) {
            const target = new URL(redirect);
            target.searchParams.set("code", "test-code");
            target.searchParams.set("state", `${flow} & /`);
            target.hash = "token=test-token";
            const url = authUrl(base, "redirect", flow, redirect, target.href);
            const actual = await launchWebAuthFlow(interactive === undefined ? {url} : {url, interactive});

            assert(actual === target.href, `Redirect query/fragment changed: ${actual}`);
            assert((await authStatus(base, flow)).started === 1, "Native flow did not reach the authorization server exactly once");
        }

        // OAuth errors in the redirect are provider results, not browser transport errors.
        const target = new URL(redirect);
        target.searchParams.set("error", "access_denied");
        target.searchParams.set("state", "provider-error");

        assert(await launchWebAuthFlow({url: authUrl(base, "redirect", "provider-error", redirect, target.href)}) === target.href,
            "Provider error redirect must reach the caller unchanged");
    },
} satisfies BrowserScenario;
