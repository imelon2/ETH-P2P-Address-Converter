import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// GitHub Pages workflow sets VITE_BASE to "/<repo-name>/" so assets resolve
// at https://<user>.github.io/<repo-name>/. Falls back to "./" for local
// `vite preview` and direct file:// opens.
export default defineConfig({
  base: process.env.VITE_BASE || "./",
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
