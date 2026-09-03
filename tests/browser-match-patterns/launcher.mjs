import {execFile} from "node:child_process";
import {resolve} from "node:path";
import {promisify} from "node:util";

const run = promisify(execFile);

const browserHint =
    "Use the full Chrome for Testing or Chromium executable, not regular Google Chrome or chrome-headless-shell. " +
    "Regular Google Chrome 137+ disables --load-extension, which this smoke requires. " +
    "See CONTRIBUTING.md#browser-match-pattern-smoke for setup.";

export const assertSupportedBrowser = (version, path) => {
    if (!/^(?:Google Chrome for Testing|Chromium) \d+\./.test(version)) {
        throw new Error(`Unsupported browser at ${JSON.stringify(path)}: ${JSON.stringify(version)}. ${browserHint}`);
    }
};

export const inspectBrowser = async binary => {
    if (!binary) {
        throw new Error(`Usage: npm run test:browser-match-patterns -- /absolute/path/to/browser. ${browserHint}`);
    }

    const path = resolve(binary);
    let version;

    try {
        const {stdout} = await run(path, ["--version"], {
            encoding: "utf8",
            timeout: 5000,
            killSignal: "SIGKILL",
            maxBuffer: 4096,
        });

        version = stdout.trim();
    } catch (error) {
        const reason = error.killed ? "--version did not finish within 5 seconds" : error.code || error.message;
        throw new Error(`Cannot inspect browser at ${JSON.stringify(path)} (${reason}). ${browserHint}`);
    }

    assertSupportedBrowser(version, path);

    return {path, version};
};

export const browserSmokeError = (reason, browser, diagnostics = "") =>
    new Error(
        `${reason}\nBrowser: ${browser.version} (${browser.path})\n${browserHint}` +
            (diagnostics ? `\nBrowser stderr (last 1200 characters):\n${diagnostics.slice(-1200)}` : "")
    );
