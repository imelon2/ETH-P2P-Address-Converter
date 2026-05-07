import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  base: "./",
  plugins: [
    nodePolyfills({
      protocolImports: true,
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
