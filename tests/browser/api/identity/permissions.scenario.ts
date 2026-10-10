import {getIdentityRedirectUrl, isAvailableIdentity, launchWebAuthFlow} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";
import {authStatus, authUrl} from "./fixture";

import type {BrowserScenario} from "../../types";

export default {
    id: "missing-identity-permission",
    async run({base}) {
        assert(!isAvailableIdentity(), "identity must be unavailable without permission");
        await rejects(() => getIdentityRedirectUrl(), "Redirect URL access must fail without permission");

        await rejects(() => launchWebAuthFlow({url: authUrl(base, "login", "denied"), interactive: false}),
            "Auth flow must reject without identity permission");

        assert((await authStatus(base, "denied")).started === 0, "Denied auth flow must not contact the provider");
    },
} satisfies BrowserScenario;
