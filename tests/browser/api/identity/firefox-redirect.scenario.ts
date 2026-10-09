import {getIdentityRedirectUrl, launchWebAuthFlow} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";
import {authStatus, authUrl} from "./fixture";

import type {BrowserScenario} from "../../types";

export default {
    id: "web-auth-firefox-redirect-uri",
    browsers: ["firefox"],
    async run({base}) {
        const flow = "firefox-loopback";
        const subdomain = new URL(getIdentityRedirectUrl()).hostname.split(".")[0];
        const redirect = `http://127.0.0.1/mozoauth2/${subdomain}`;
        const target = new URL(redirect);
        target.searchParams.set("code", "firefox-code");

        const actual = await launchWebAuthFlow({
            url: authUrl(base, "redirect", flow, redirect, target.href),
            interactive: false,
        });

        assert(actual === target.href, "Firefox redirect_uri was not forwarded");
        const status = await authStatus(base, flow);
        assert(status.started === 1, "Firefox must contact the local authorization endpoint");

        await rejects(() => launchWebAuthFlow({
            url: authUrl(base, "redirect", "invalid-redirect", `${base}/arbitrary-callback`),
            interactive: false,
        }), "Firefox must reject an arbitrary redirect_uri before contacting the provider");

        assert((await authStatus(base, "invalid-redirect")).started === 0, "Invalid redirect URI reached the provider");
    },
} satisfies BrowserScenario;
