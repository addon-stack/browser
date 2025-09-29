import {defineConfig, type Options} from "tsup";

const common: Options = {
    entry: ["src/index.ts"],
    bundle: true,
    outDir: "dist",
    sourcemap: true,
};

export default defineConfig([
    {
        ...common,
        format: ["esm"],
        dts: true,
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
