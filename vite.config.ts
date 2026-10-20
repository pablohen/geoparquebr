import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	plugins: [tanstackStart(), viteReact()],
});
