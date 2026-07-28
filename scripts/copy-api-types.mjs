import {copyFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");

copyFileSync(join(rootDirectory, "src/api.d.ts"), join(rootDirectory, "dist/api.d.ts"));
