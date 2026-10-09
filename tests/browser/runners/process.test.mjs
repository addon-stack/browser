import {describe, expect, test} from "@jest/globals";

import {launchProcess} from "./process.mjs";

describe("owned browser process lifecycle", () => {
    test("reports startup failure", async () => {
        const child = launchProcess("/nonexistent/browser-executable", []);
        await expect(child.closed).rejects.toMatchObject({code: "ENOENT"});
    });

    test("captures diagnostics and terminates an owned child", async () => {
        const child = launchProcess(process.execPath, ["-e", 'console.error("test diagnostic"); setInterval(() => {}, 1000)']);

        try {
            const deadline = Date.now() + 3000;

            while (!child.diagnostics.includes("test diagnostic") && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            expect(child.diagnostics).toContain("test diagnostic");
        } finally {
            await child.stop();
        }

        await expect(child.closed).resolves.toBeDefined();
    });

    (process.platform === "win32" ? test.skip : test)("escalates an unresponsive owned process and allows repeated cleanup", async () => {
        const child = launchProcess(process.execPath, ["-e", 'process.on("SIGTERM", () => {}); console.error("ready"); setInterval(() => {}, 1000)']);

        try {
            const deadline = Date.now() + 3000;

            while (!child.diagnostics.includes("ready") && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            expect(child.diagnostics).toContain("ready");
        } finally {
            await child.stop();
        }

        await expect(child.closed).resolves.toMatchObject({signal: "SIGKILL"});
        await expect(child.stop()).resolves.toBeUndefined();
    }, 10000);
});
