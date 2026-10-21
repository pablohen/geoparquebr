import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { base64Imports } from "./scripts/vite/base64-imports.ts";

export default defineConfig(({ mode }) => ({
	// Compiles messages/ into src/paraglide, which components and tests import.
	plugins: [
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/paraglide",
			strategy: ["url", "baseLocale"],
			emitTsDeclarations: true,
			// Same layout and in-place writes as `pnpm i18n` and the dev server,
			// so compiling from one command never breaks another that is running.
			outputStructure: "locale-modules",
			cleanOutdir: false,
		}),
		base64Imports(),
	],
	resolve: {
		alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	test: {
		include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
		// Run share-card binaries through base64Imports instead of Node's loader.
		server: { deps: { inline: [/@resvg\/resvg-wasm/, /@fontsource\/inter/] } },
		environment: "node",
		// Expose .env (MONGODB_URI) to integration tests; they skip without it.
		env: loadEnv(mode, process.cwd(), ""),
	},
}));
