import {defineConfig, type Options} from "tsup";

const common: Options = {
    bundle: true,
    // Clean dist before tsup starts; parallel builds share this output directory.
    clean: false,
    outDir: "dist",
    sourcemap: true,
};

export default defineConfig([
    {
        ...common,
        entry: {index: "src/index.ts", utils: "src/api/utils.ts"},
        format: ["esm"],
        dts: {
            banner: '/// <reference types="chrome" />\n/// <reference path="./api.d.ts" />',
        },
        outExtension() {
            return {js: ".js"};
        },
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
    },
    {
        ...common,
        entry: {index: "src/index.ts", utils: "src/api/utils.ts"},
        format: ["cjs"],
        dts: false,
        outExtension() {
            return {js: ".cjs"};
        },
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
    },
]);
