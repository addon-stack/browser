import {defineConfig} from "tsup";

export default defineConfig({
    // Single entry file for library bundle
    entry: ["src/index.ts"],
    // Bundle into a single file per format (enables correct module specifiers and tree-shaking)
    bundle: true,
    // Output directory
    outDir: "dist",
    // Generate both CommonJS and ESModule bundles
    format: ["esm", "cjs"],
    // Emit declaration files
    dts: true,
    // Generate source maps
    sourcemap: true,
    // Adjust file extensions for output bundles
    outExtension({format}) {
        return {js: format === "cjs" ? ".cjs.js" : ".js"};
    },
    // Clean output directory before each build
    clean: true,
});
