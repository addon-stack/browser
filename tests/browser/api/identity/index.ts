import authTokenNoOauth from "./auth-token-no-oauth.scenario";
import authTokenPermissions from "./auth-token-permissions.scenario";
import errors from "./errors.scenario";
import firefoxRedirect from "./firefox-redirect.scenario";
import interactive from "./interactive.scenario";
import permissions from "./permissions.scenario";
import redirect from "./redirect.scenario";

import type {BrowserSuite} from "../../types";

export default {
    id: "identity",
    browsers: ["chromium", "firefox"],
    profiles: [
        {id: "granted", permissions: ["identity"], scenarios: [redirect, errors, interactive, firefoxRedirect, authTokenNoOauth]},
        {id: "denied", permissions: [], scenarios: [permissions, authTokenPermissions]},
    ],
} satisfies BrowserSuite;
