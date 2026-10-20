/**
 * Curated 3D models and the geosites they belong to.
 *
 * Models come from GeoHereditas (IGc-USP) on Sketchfab. CC BY ones can be
 * downloaded with `pnpm models:fetch` and served from `public/models/`;
 * everything else (and CC BY ones not downloaded yet) uses Sketchfab's embed.
 *
 * Only attach a model where the provenance is defensible, and say how.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { GeositeCategory, Model3D, ModelProvenance } from "./schemas";

export type CatalogEntry = {
	sketchfabUid: string;
	title: string;
	kind: Model3D["kind"];
	/** "CC-BY-4.0" may be redistributed (self-hosted); anything else is embed-only. */
	license: "CC-BY-4.0" | "Sketchfab Standard";
	attribution: string;
	provenance: ModelProvenance;
	upAxis?: "y" | "z";
	attachTo: { geossitIds?: number[]; categories?: GeositeCategory[] };
};

const IGC_USP = "GeoHereditas · Museu de Geociências IGc-USP";

export const MODEL_CATALOG: CatalogEntry[] = [
	{
		sketchfabUid: "d8f10872f8f54154892076ec241e71f0",
		title: "Peixe fóssil da Bacia do Araripe (acervo IGc-USP)",
		kind: "fossil",
		license: "CC-BY-4.0",
		attribution: IGC_USP,
		// Basin-level provenance; the specimen's exact member/locality isn't published.
		provenance: "region",
		// GEOSSIT 1915 "Membro Romualdo da Formação Santana" — fish-bearing nodules.
		attachTo: { geossitIds: [1915] },
	},
	{
		sketchfabUid: "eec51ca568334bdcb454778439f4bfb8",
		title: "Amonita (acervo IGc-USP)",
		kind: "fossil",
		license: "Sketchfab Standard",
		attribution: IGC_USP,
		provenance: "illustrative",
		// GEOSSIT 1920 "Estratos Calcários da Pedreira Poty": K–Pg boundary,
		// whose abstract cites the extinction of ammonites.
		attachTo: { geossitIds: [1920] },
	},
	{
		sketchfabUid: "5948db8fa1b740b589ee748c8e99e611",
		title:
			"Espeleotema: estalagmite de aragonita com coralóides (acervo IGc-USP)",
		kind: "cave",
		license: "CC-BY-4.0",
		attribution: IGC_USP,
		provenance: "illustrative",
		attachTo: { categories: ["speleological"] },
	},
];

export const MODELS_DIR = join(process.cwd(), "public", "models");

export const selfHostedPath = (uid: string) => `/models/${uid}.glb`;

const hasLocalGlb = (uid: string) => existsSync(join(MODELS_DIR, `${uid}.glb`));

const PROVENANCE_ORDER: Record<ModelProvenance, number> = {
	locality: 0,
	region: 1,
	illustrative: 2,
};

/** Models for one geosite, most specific provenance first. */
export function modelsFor(
	geosite: { source?: { id: number }; categories: GeositeCategory[] },
	hasLocalFile: (uid: string) => boolean = hasLocalGlb,
): Model3D[] {
	return MODEL_CATALOG.filter(
		({ attachTo }) =>
			(geosite.source && attachTo.geossitIds?.includes(geosite.source.id)) ||
			attachTo.categories?.some((c) => geosite.categories.includes(c)),
	)
		.sort(
			(a, b) => PROVENANCE_ORDER[a.provenance] - PROVENANCE_ORDER[b.provenance],
		)
		.map((entry): Model3D => {
			const common = {
				kind: entry.kind,
				title: entry.title,
				provenance: entry.provenance,
				license: entry.license,
				attribution: entry.attribution,
				sourceUrl: `https://sketchfab.com/3d-models/${entry.sketchfabUid}`,
			};
			return entry.license === "CC-BY-4.0" && hasLocalFile(entry.sketchfabUid)
				? {
						...common,
						provider: "gltf",
						format: "glb",
						url: selfHostedPath(entry.sketchfabUid),
						upAxis: entry.upAxis ?? "y",
					}
				: { ...common, provider: "sketchfab", uid: entry.sketchfabUid };
		});
}
