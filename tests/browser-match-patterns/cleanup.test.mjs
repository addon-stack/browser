import fs from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, jest, test} from "@jest/globals";
import {removeBrowserTemporaryDirectory} from "./cleanup.mjs";

afterEach(() => jest.restoreAllMocks());

describe("browser smoke cleanup", () => {
    test("removes an actual temporary profile with bounded native filesystem retries enabled", async () => {
        const directory = await fs.mkdtemp(join(tmpdir(), "browser-smoke-cleanup-test-"));

        try {
            const profile = join(directory, "profile", "Default");
            await fs.mkdir(profile, {recursive: true});
            await fs.writeFile(join(profile, "Preferences"), "{}");
            const remove = jest.spyOn(fs, "rm");
            await removeBrowserTemporaryDirectory(directory);

            // ENOTEMPTY retries are implemented by Node. Guard the options at that boundary:
            // force alone ignores ENOENT, but leaves maxRetries at zero.
            expect(remove).toHaveBeenCalledTimes(1);

            expect(remove).toHaveBeenCalledWith(directory, {
                recursive: true,
                force: true,
                maxRetries: 10,
                retryDelay: 100,
            });

            await expect(fs.stat(directory)).rejects.toMatchObject({code: "ENOENT"});
        } finally {
            jest.restoreAllMocks();
            await fs.rm(directory, {recursive: true, force: true});
        }
    });

    test("accepts an already removed temporary directory", async () => {
        const directory = await fs.mkdtemp(join(tmpdir(), "browser-smoke-cleanup-test-"));

        try {
            await removeBrowserTemporaryDirectory(directory);
            await expect(removeBrowserTemporaryDirectory(directory)).resolves.toBeUndefined();
        } finally {
            await fs.rm(directory, {recursive: true, force: true});
        }
    });

    test.each(["ENOTEMPTY", "EBUSY", "EACCES"])("propagates %s after native removal fails", async code => {
        const directory = join(tmpdir(), "browser-smoke-cleanup-mocked");
        const failure = Object.assign(new Error(`Filesystem failure: ${code}`), {code});
        jest.spyOn(fs, "rm").mockRejectedValue(failure);

        await expect(removeBrowserTemporaryDirectory(directory)).rejects.toMatchObject({
            message: `Browser smoke cleanup failed after filesystem retries: ${directory}`,
            cause: failure,
        });
    });
});
