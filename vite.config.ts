import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";
import { missingMessages } from "./src/lib/catalog-guard.ts";

export default defineConfig({
	resolve: {
		alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	plugins: [
		// UI copy: messages/{locale}.json compiled to typed m.* functions in
		// src/paraglide (git-ignored). The locale comes from the URL: pt-BR at
		// the root, English under /en (see the router's rewrite in router.tsx).
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/paraglide",
			strategy: ["url", "baseLocale"],
			emitTsDeclarations: true,
		}),
		catalogGuard(),
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

// Vercel deploys without running the tests, so the build itself refuses a
// catalog that compiled without messages or with a locale missing some.
function catalogGuard(): Plugin {
	return {
		name: "geoparquebr:catalog-guard",
		apply: "build",
		buildEnd() {
			const index = readFileSync("src/paraglide/messages/_index.js", "utf8");
			const { locales } = JSON.parse(
				readFileSync("project.inlang/settings.json", "utf8"),
			);
			for (const locale of locales as string[]) {
				const missing = missingMessages(
					JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")),
					index,
				);
				if (missing.length > 0)
					this.error(
						`Paraglide compiled without ${missing.length} ${locale} messages (${missing.slice(0, 3).join(", ")}…)`,
					);
			}
		},
	};
}
