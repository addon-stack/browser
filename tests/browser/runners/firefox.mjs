import {execFile} from "node:child_process";
import {writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {promisify} from "node:util";

import {freePort, installTemporaryExtension} from "./firefox-remote.mjs";
import {launchProcess} from "./process.mjs";

export async function inspectFirefox(binary) {
    if (!binary) {
        throw new Error("Set FIREFOX_PATH or pass --binary /absolute/path/to/firefox.");
    }

    const path = resolve(binary);
    const {stdout} = await promisify(execFile)(path, ["--version"], {timeout: 5000, killSignal: "SIGKILL", maxBuffer: 4096});
    const version = stdout.trim();

    if (!/^Mozilla Firefox \d+\./.test(version)) {
        throw new Error(`Expected Firefox at ${path}, received ${JSON.stringify(version)}.`);
    }

    return {path, version};
}

export async function launchFirefox({binary, profile, extension}) {
    const port = await freePort();

    const preferences = {
        "devtools.debugger.remote-enabled": true,
        "devtools.debugger.prompt-connection": false,
        "devtools.debugger.force-local": true,
        "devtools.chrome.enabled": true,
        "browser.shell.checkDefaultBrowser": false,
        "browser.aboutwelcome.enabled": false,
        "browser.startup.page": 0,
        "browser.startup.homepage_override.mstone": "ignore",
        "browser.startup.homepage": "about:blank",
        "datareporting.policy.dataSubmissionPolicyBypassNotification": true,
    };

    await writeFile(join(profile, "user.js"), Object.entries(preferences)
        .map(([name, value]) => `user_pref(${JSON.stringify(name)}, ${JSON.stringify(value)});`).join("\n"));

    const browser = launchProcess(binary, ["-headless", "-no-remote", "-profile", profile, "--start-debugger-server", String(port), "about:blank"]);

    try {
        await Promise.race([
            installTemporaryExtension(port, extension),
            browser.closed.then(({code, signal}) => {
                throw new Error(`Firefox exited during installation (${code ?? signal})`);
            }),
        ]);

        return browser;
    } catch (error) {
        await browser.stop();
        throw new Error(`${error.message}\n${browser.diagnostics}`, {cause: error});
    }
}
