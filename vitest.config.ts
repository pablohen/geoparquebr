import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
	// Compiles messages/ into src/paraglide, which components and tests import.
	plugins: [
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/paraglide",
			strategy: ["url", "baseLocale"],
			emitTsDeclarations: true,
		}),
	],
	resolve: {
		alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	test: {
		include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
		environment: "node",
		// Expose .env (MONGODB_URI) to integration tests; they skip without it.
		env: loadEnv(mode, process.cwd(), ""),
	},
}));
