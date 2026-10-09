import {spawn} from "node:child_process";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {generate} from "../codegen/index.mjs";

const require = createRequire(import.meta.url);
const cwd = fileURLToPath(new URL("../", import.meta.url));
await generate();

const children = [
    spawn(process.execPath, ["--watch", "--watch-preserve-output", "./codegen/index.mjs"], {cwd, stdio: "inherit"}),
    spawn(process.execPath, [require.resolve("tsup/dist/cli-default.js"), "--watch", "src"], {cwd, stdio: "inherit"}),
];

let stopping = false;

function stop(code) {
    if (stopping) return;

    stopping = true;
    process.exitCode = code;

    for (const child of children) {
        child.kill();
    }
}

for (const child of children) {
    child.on("error", error => {
        console.error(error);
        stop(1);
    });

    child.on("exit", code => stop(code ?? 1));
}

process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
