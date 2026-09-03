import {describe, expect, test} from "@jest/globals";
import {assertSupportedBrowser, browserSmokeError, inspectBrowser} from "./launcher.mjs";

describe("browser smoke launcher diagnostics", () => {
    test.each(["Google Chrome for Testing 148.0.7778.96", "Chromium 148.0.7778.96"])("accepts %s", version => {
        expect(() => assertSupportedBrowser(version, "/test/browser")).not.toThrow();
    });

    test.each([
        "Google Chrome 152.0.7977.65",
        "Google Chrome Canary 152.0.0.0",
        "HeadlessChrome/148.0.0.0",
        "",
    ])("rejects unsupported/unknown brand before starting the smoke: %s", version => {
        expect(() => assertSupportedBrowser(version, "/test/browser")).toThrow("Chrome for Testing or Chromium");
        expect(() => assertSupportedBrowser(version, "/test/browser")).toThrow("--load-extension");
    });

    test("missing arguments show the npm command", async () => {
        await expect(inspectBrowser()).rejects.toThrow("npm run test:browser-match-patterns --");
    });

    test("missing executable has an actionable error instead of a smoke timeout", async () => {
        await expect(inspectBrowser("/nonexistent-browser-match-patterns/executable")).rejects.toThrow(
            /Cannot inspect browser.*ENOENT.*Chrome for Testing/
        );
    });

    test("an actual non-browser executable is rejected after reading its version", async () => {
        await expect(inspectBrowser(process.execPath)).rejects.toThrow("Unsupported browser");
    });

    test("timeout diagnostics lead with the remedy, retain the browser identity and bound stderr", () => {
        const error = browserSmokeError(
            "Browser smoke timed out after 30 seconds; missing results: wildcard, narrow, all.",
            {path: "/test/browser", version: "Chromium 148.0.0.0"},
            `${"updater noise".repeat(1000)}last diagnostic`
        );
        expect(error.message).toContain("Chrome for Testing or Chromium");
        expect(error.message).toContain("--load-extension");
        expect(error.message).toContain("Chromium 148.0.0.0 (/test/browser)");
        expect(error.message).toContain("missing results: wildcard, narrow, all");
        expect(error.message.indexOf("Chrome for Testing")).toBeLessThan(error.message.indexOf("Browser stderr"));
        expect(error.message).toMatch(/last diagnostic$/);
        expect(error.message.length).toBeLessThan(2000);
    });
});
