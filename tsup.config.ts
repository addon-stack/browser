import {defineConfig} from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    bundle: true,
    outDir: "dist",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    outExtension({format}) {
        return {js: format === "cjs" ? ".cjs" : ".js"};
    },
    clean: true,
});
