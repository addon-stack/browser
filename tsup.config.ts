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
        platform: "browser",
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
        platform: "browser",
        sourcemap: false,
        dts: false,
        outExtension() {
            return {js: ".cjs"};
        },
        clean: false,
    },
    {
        ...common,
        entry: {"testing/node/index": "src/testing/node/index.ts"},
        format: ["esm"],
        platform: "node",
        removeNodeProtocol: false,
        sourcemap: false,
        dts: {banner: '/// <reference types="chrome" />\n/// <reference path="../../api.d.ts" />'},
        outExtension({format}) {
            return {js: format === "cjs" ? ".cjs" : ".js"};
        },
        clean: false,
    },
    {
        ...common,
        entry: {"testing/node/index": "src/testing/node/index.ts"},
        format: ["cjs"],
        platform: "node",
        removeNodeProtocol: false,
        sourcemap: false,
        dts: false,
        outExtension() {
            return {js: ".cjs"};
        },
        clean: false,
    },
]);
