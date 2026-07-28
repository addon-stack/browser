import {defineConfig, type Options} from "tsup";

const common: Options = {
    entry: ["src/index.ts", "src/utils.ts"],
    bundle: true,
    outDir: "dist",
    sourcemap: true,
};

export default defineConfig([
    {
        ...common,
        format: ["esm"],
        dts: {
            banner: '/// <reference types="chrome" />\n/// <reference path="./api.d.ts" />',
        },
        outExtension() {
            return {js: ".js"};
        },
        clean: true,
    },
    {
        ...common,
        format: ["cjs"],
        dts: false,
        outExtension() {
            return {js: ".cjs"};
        },
        clean: false,
    },
]);
