import {launchWebAuthFlow} from "../../../../dist/index.js";
import {assert, rejects} from "../../extension/assert";
import {authStatus, authUrl} from "./fixture";

import type {BrowserScenario} from "../../types";

export default {
    id: "web-auth-errors",
    async run({base}) {
        for (const interactive of [undefined, false]) {
            const flow = `login-${interactive}`;
            const url = authUrl(base, "login", flow);

            await rejects(() => launchWebAuthFlow(interactive === undefined ? {url} : {url, interactive}),
                "A login page must reject when interaction is disabled");

            const status = await authStatus(base, flow);
            assert(status.started >= 1 && status.polls === 0, "Failure must follow a real noninteractive request");
        }

        await rejects(() => launchWebAuthFlow({url: authUrl(base, "error", "server-error"), interactive: false}),
            "A failed authorization endpoint must reject");

        assert((await authStatus(base, "server-error")).started >= 1, "Server-error flow never reached the server");
    },
} satisfies BrowserScenario;
