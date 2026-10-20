import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
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
