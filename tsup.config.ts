import {defineConfig} from "tsup";

export default defineConfig({
    // Entry file(s)
    entry: ["src/index.ts"],
    // Output directory
    outDir: "dist",
    // Generate both CommonJS and ESModule bundles
    format: ["cjs", "esm"],
    // Emit declaration files
    dts: true,
    // Generate source maps
    sourcemap: true,
    // Adjust file extensions for output bundles
    outExtension({format}) {
        return {js: format === "esm" ? ".esm.js" : ".cjs.js"};
    },
    // Clean output directory before each build
    clean: true,
});
