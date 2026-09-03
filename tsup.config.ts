import {defineConfig, type Options} from "tsup";

const common: Options = {
    bundle: true,
    outDir: "dist",
    sourcemap: true,
};

export default defineConfig([
    {
        ...common,
        entry: ["src/index.ts", "src/utils.ts"],
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
        entry: {"testing/index": "src/testing/index.ts"},
        format: ["esm"],
        sourcemap: false,
        dts: {
            banner: '/// <reference types="chrome" />\n/// <reference path="../api.d.ts" />',
        },
        outExtension() {
            return {js: ".js"};
        },
        clean: false,
    },
    {
        ...common,
        entry: ["src/index.ts", "src/utils.ts"],
        format: ["cjs"],
        dts: false,
        outExtension() {
            return {js: ".cjs"};
        },
        clean: false,
    },
    {
        ...common,
        entry: {"testing/index": "src/testing/index.ts"},
        format: ["cjs"],
        sourcemap: false,
        dts: false,
        outExtension() {
            return {js: ".cjs"};
        },
        clean: false,
    },
]);
