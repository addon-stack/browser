import fs from "node:fs/promises";

export const removeBrowserTemporaryDirectory = async directory => {
    try {
        // Chromium can still flush profile files after its main process exits.
        // Let Node retry transient filesystem errors, without hiding persistent failures.
        await fs.rm(directory, {recursive: true, force: true, maxRetries: 10, retryDelay: 100});
    } catch (error) {
        throw new Error(`Browser smoke cleanup failed after filesystem retries: ${directory}`, {cause: error});
    }
};
