import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	plugins: [
		tanstackStart(),
		// Turns the server build into a deployable app. The preset comes from
		// the environment: Vercel when VERCEL=1 (or NITRO_PRESET=vercel),
		// a standalone Node.js server in .output/ otherwise.
		nitro({
			vercel: {
				// São Paulo: next to the users, the SGB/GEOSSIT APIs and an
				// Atlas cluster in AWS sa-east-1.
				functions: { regions: ["gru1"], maxDuration: 30 },
			},
		}),
		viteReact(),
	],
});
