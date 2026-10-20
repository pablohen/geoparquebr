/**
 * Downloads the CC BY models from the catalog via the Sketchfab API, optimizes
 * them for the web, and writes them to public/models/<uid>.glb.
 * Afterwards run `pnpm db:seed` so geosites point at the self-hosted files.
 *
 * Usage: pnpm models:fetch [--force]
 * Needs SKETCHFAB_TOKEN in .env (https://sketchfab.com/settings/password → API token).
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
	MODEL_CATALOG,
	MODELS_DIR,
} from "~/features/geosites/model-catalog.server";
import { optimizeGlb } from "./lib/optimize-glb";

const API = "https://api.sketchfab.com/v3";
const force = process.argv.includes("--force");
const token = process.env.SKETCHFAB_TOKEN;
if (!token) {
	console.error(
		"SKETCHFAB_TOKEN is not set. Create one at https://sketchfab.com/settings/password (API token) and add it to .env.",
	);
	process.exit(1);
}

const ModelInfoSchema = z.object({
	name: z.string(),
	isDownloadable: z.boolean(),
	license: z.object({ slug: z.string(), label: z.string() }).nullable(),
});

const DownloadSchema = z.object({
	glb: z.object({ url: z.url(), size: z.number() }).optional(),
	gltf: z.object({ url: z.url(), size: z.number() }).optional(),
});

async function getJson<T>(url: string, schema: z.ZodType<T>, auth = false) {
	const res = await fetch(url, {
		headers: auth ? { Authorization: `Token ${token}` } : {},
		signal: AbortSignal.timeout(60_000),
	});
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
	return schema.parse(await res.json());
}

const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

await mkdir(MODELS_DIR, { recursive: true });
let failed = 0;

for (const entry of MODEL_CATALOG.filter((e) => e.license === "CC-BY-4.0")) {
	const uid = entry.sketchfabUid;
	const out = join(MODELS_DIR, `${uid}.glb`);
	if (existsSync(out) && !force) {
		console.log(
			`✓ ${entry.title}: already downloaded (use --force to refresh)`,
		);
		continue;
	}
	try {
		// Re-check the licence at download time; authors can change it.
		const info = await getJson(`${API}/models/${uid}`, ModelInfoSchema);
		if (info.license?.slug !== "by" || !info.isDownloadable)
			throw new Error(
				`licence is now "${info.license?.label ?? "none"}" (downloadable: ${info.isDownloadable}); update the catalog`,
			);

		const links = await getJson(
			`${API}/models/${uid}/download`,
			DownloadSchema,
			true,
		);
		if (!links.glb)
			throw new Error(
				"Sketchfab offers no GLB for this model (only a glTF zip)",
			);

		console.log(`↓ ${entry.title} (${mb(links.glb.size)})`);
		const res = await fetch(links.glb.url, {
			signal: AbortSignal.timeout(600_000),
		});
		if (!res.ok) throw new Error(`GLB download: HTTP ${res.status}`);
		const raw = new Uint8Array(await res.arrayBuffer());

		const { glb, trianglesBefore, trianglesAfter } = await optimizeGlb(raw);
		await writeFile(out, glb);
		console.log(
			`  → public/models/${uid}.glb: ${mb(raw.byteLength)} → ${mb(glb.byteLength)}, ` +
				`${trianglesBefore.toLocaleString()} → ${trianglesAfter.toLocaleString()} triangles`,
		);
	} catch (err) {
		failed++;
		console.error(
			`✗ ${entry.title}: ${err instanceof Error ? err.message : err}`,
		);
	}
}

process.exit(failed > 0 ? 1 : 0);
