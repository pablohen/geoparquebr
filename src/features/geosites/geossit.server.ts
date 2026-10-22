/**
 * Import from GEOSSIT, the Geological Survey of Brazil's (SGB/CPRM) inventory
 * of geosites, published as an ArcGIS FeatureServer layer.
 *
 * Read-only: the layer advertises edit capabilities, but we only ever `query`.
 */
import { z } from "zod";
import { GEOPARK_MUNICIPALITIES } from "~/features/geoparks/geoparks";
import { type BrazilPlaces, placeGeosite } from "./placement";
import {
	type DegradationRisk,
	type GeoparkId,
	type GeositeCategory,
	type GeositeInput,
	GeositeInputSchema,
	type Relevance,
} from "./schemas";

export const GEOSSIT_LAYER_URL =
	"https://geoportal.sgb.gov.br/server/rest/services/gestaoterritorial/geossit/FeatureServer/0";

const PAGE_SIZE = 1_000; // the layer's maxRecordCount

// ---------------------------------------------------------------------------
// Raw feature (as served, f=geojson). Attribute values are mostly strings.
// ---------------------------------------------------------------------------

const optionalText = z
	.string()
	.nullish()
	.transform((s) => s?.trim() || undefined);

const score = z.coerce.number().int().min(0).max(400).nullish().catch(null);

const GeossitPropertiesSchema = z.object({
	id_geossitio: z.coerce.number().int().positive(),
	nome: z.string().trim().min(1),
	municipio: z.string().trim().min(1),
	uf: z.string().trim().length(2),
	tematica_principal: optionalText,
	enquadramento_geologico: optionalText,
	provincia_geologica: optionalText,
	indicativo_de_relevancia: z.string(),
	quantificacao_cientifica__0_400: score,
	quantificacao_turistica__0_400_: score,
	quantificacao_didatica__0_400_: score,
	quantificacao_de_vulnerabilidad: score,
	risco_de_degradacao: optionalText,
	geoparque__proposta_: optionalText,
	resumo: optionalText,
	autores: optionalText,
	ultima_edicao: z.coerce.number().nullish(),
	link_geossit: optionalText,
	link_imagem_representativa: optionalText,
});

const GeossitFeatureSchema = z.object({
	type: z.literal("Feature"),
	geometry: z.object({
		type: z.literal("Point"),
		coordinates: z.tuple([z.number(), z.number()]),
	}),
	properties: GeossitPropertiesSchema,
});
type GeossitFeature = z.infer<typeof GeossitFeatureSchema>;

const PageSchema = z.object({
	features: z.array(z.unknown()),
	exceededTransferLimit: z.boolean().optional(),
	properties: z.object({ exceededTransferLimit: z.boolean() }).optional(),
});

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/**
 * GET with retries: GEOSSIT's ArcGIS server answers HTTP 500 now and then.
 * Retries 5xx and network errors with a growing pause; 4xx fail at once.
 */
export async function fetchWithRetries(
	url: URL,
	{ attempts = 3, pauseMs = 2_000 } = {},
): Promise<Response> {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
			if (res.ok || res.status < 500 || attempt >= attempts) return res;
		} catch (err) {
			if (attempt >= attempts) throw err;
		}
		await new Promise((r) => setTimeout(r, pauseMs * attempt));
	}
}

/** All raw features, paginated. Coordinates are reprojected server-side to WGS 84. */
export async function fetchGeossitFeatures(): Promise<unknown[]> {
	const all: unknown[] = [];
	for (let offset = 0; ; offset += PAGE_SIZE) {
		const url = new URL(`${GEOSSIT_LAYER_URL}/query`);
		url.search = new URLSearchParams({
			where: "1=1",
			outFields: "*",
			outSR: "4326",
			orderByFields: "objectid",
			resultOffset: String(offset),
			resultRecordCount: String(PAGE_SIZE),
			f: "geojson",
		}).toString();

		const res = await fetchWithRetries(url);
		if (!res.ok) throw new Error(`GEOSSIT query failed: HTTP ${res.status}`);
		const page = PageSchema.parse(await res.json());
		all.push(...page.features);

		const more =
			page.exceededTransferLimit ?? page.properties?.exceededTransferLimit;
		if (!more || page.features.length === 0) return all;
	}
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** ASCII, lower-case, no punctuation — GEOSSIT text is inconsistently accented. */
export function normalize(s: string): string {
	return s
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function slugify(s: string): string {
	return normalize(s).replace(/ /g, "-").slice(0, 80).replace(/-+$/, "");
}

const THEME_TO_CATEGORY: Record<string, GeositeCategory> = {
	paleontologia: "paleontological",
	paleoambiental: "paleoenvironmental",
	geomorfologia: "geomorphological",
	espeleologia: "speleological",
	estratigrafia: "stratigraphic",
	sedimentologia: "sedimentological",
	mineralogia: "mineralogical",
	petrologia: "petrological",
	plutonismo: "igneous",
	vulcanismo: "igneous",
	metamorfismo: "metamorphic",
	tectonica: "tectonic",
	neotectonica: "tectonic",
	hidrogeologia: "hydrogeological",
	metalogenia: "metallogenic",
	pedologia: "pedological",
	"formacoes superficiais": "pedological",
	astroblema: "impact",
	"ambientes marinho": "marine",
	"historia da mineracao": "historical",
	"historia da geologia": "historical",
};

const RELEVANCE: Record<string, Relevance> = {
	"geossitio de relevancia internacional": "international",
	"geossitio de relevancia nacional": "national",
	"sitio da geodiversidade": "geodiversity",
};

const RISK: Record<string, DegradationRisk> = {
	baixo: "low",
	medio: "medium",
	alto: "high",
};

/**
 * UNESCO Global Geoparks are legally made up of whole municipalities, which is
 * more reliable than GEOSSIT's free-text "geoparque (proposta)" field (it marks
 * e.g. the Romualdo Member as "Não" although it lies inside Araripe).
 */
const MUNICIPALITY_TO_GEOPARK = new Map<string, GeoparkId>(
	Object.entries(GEOPARK_MUNICIPALITIES).flatMap(([id, keys]) =>
		keys.map((k) => [k, id as GeoparkId] as const),
	),
);

/** First sentences of the abstract, cut at a word boundary to fit 500 chars. */
function toSummary(text: string | undefined): string {
	if (!text) return "";
	const flat = text.replace(/\s+/g, " ").trim();
	if (flat.length <= 500) return flat;
	const sentences = flat.slice(0, 500).match(/^.*[.!?](?=\s)/)?.[0];
	if (sentences && sentences.length > 200) return sentences;
	return `${flat.slice(0, 497).replace(/\s+\S*$/, "")}…`;
}

/** cprm.gov.br now 301s to sgb.gov.br; also force HTTPS (both hosts support it). */
function canonicalSgbUrl(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	try {
		const url = new URL(raw.trim());
		url.protocol = "https:";
		if (url.hostname === "www.cprm.gov.br") url.hostname = "www.sgb.gov.br";
		return url.toString();
	} catch {
		return undefined;
	}
}

function toGeositeInput(
	f: GeossitFeature,
	slug: string,
	places: BrazilPlaces | undefined,
): GeositeInput {
	const p = f.properties;
	const theme = p.tematica_principal
		? THEME_TO_CATEGORY[normalize(p.tematica_principal)]
		: undefined;
	const relevance = RELEVANCE[normalize(p.indicativo_de_relevancia)];
	if (!relevance)
		throw new Error(`unknown relevance "${p.indicativo_de_relevancia}"`);
	const risk = p.risco_de_degradacao
		? RISK[normalize(p.risco_de_degradacao)]
		: undefined;

	const state = p.uf.toUpperCase();
	// GEOSSIT has a few 0,0, whole-degree and mistyped points; those go to
	// their municipality's centre, flagged.
	const placement = places
		? placeGeosite(f.geometry.coordinates, state, p.municipio, places)
		: ({ status: "ok", point: f.geometry.coordinates } as const);
	if (placement.status === "unplaceable") throw new Error(placement.reason);
	const geoparkId = MUNICIPALITY_TO_GEOPARK.get(
		`${state}:${normalize(p.municipio)}`,
	);
	const proposal =
		p.geoparque__proposta_ && normalize(p.geoparque__proposta_) !== "nao"
			? p.geoparque__proposta_
			: undefined;

	const scores =
		p.quantificacao_cientifica__0_400 != null &&
		p.quantificacao_turistica__0_400_ != null &&
		p.quantificacao_didatica__0_400_ != null &&
		p.quantificacao_de_vulnerabilidad != null
			? {
					scientific: p.quantificacao_cientifica__0_400,
					tourism: p.quantificacao_turistica__0_400_,
					didactic: p.quantificacao_didatica__0_400_,
					vulnerability: p.quantificacao_de_vulnerabilidad,
				}
			: undefined;

	const sourceUrl =
		canonicalSgbUrl(p.link_geossit) ??
		`https://www.sgb.gov.br/geossit/geossitios/ver/${p.id_geossitio}`;

	return {
		slug,
		name: p.nome,
		summary: toSummary(p.resumo),
		description: p.resumo,
		geoparkId,
		// A UNESCO geopark wins over a free-text proposal naming the same area.
		geoparkProposal: geoparkId ? undefined : proposal,
		municipality: p.municipio,
		state,
		categories: theme ? [theme] : [],
		relevance,
		scores,
		degradationRisk: risk,
		geology:
			p.enquadramento_geologico || p.provincia_geologica
				? {
						setting: p.enquadramento_geologico,
						province: p.provincia_geologica,
					}
				: undefined,
		location: { type: "Point", coordinates: placement.point },
		locationIsApproximate: placement.status === "approximate",
		locationIssue:
			placement.status === "approximate" ? placement.reason : undefined,
		models: [],
		coverImageUrl: canonicalSgbUrl(p.link_imagem_representativa),
		// Caves and fossil beds are vulnerable to looting/vandalism; so is
		// anything GEOSSIT rates at high degradation risk.
		locationIsSensitive:
			theme === "speleological" ||
			theme === "paleontological" ||
			risk === "high",
		source: {
			system: "geossit",
			id: p.id_geossitio,
			url: sourceUrl,
			authors: p.autores,
			updatedAt: p.ultima_edicao
				? new Date(p.ultima_edicao).toISOString()
				: undefined,
		},
	};
}

export type GeossitImportResult = {
	geosites: z.output<typeof GeositeInputSchema>[];
	skipped: { id: unknown; reason: string }[];
};

/**
 * Validates and maps raw features. Slugs come from names; names that repeat
 * across the inventory get the GEOSSIT id appended, so slugs stay stable
 * between imports. With `places`, points outside their state move to their
 * municipality's centre (`placeGeosite`); without, every point is trusted.
 */
export function mapGeossitFeatures(
	raw: unknown[],
	places?: BrazilPlaces,
): GeossitImportResult {
	const skipped: GeossitImportResult["skipped"] = [];
	const features: GeossitFeature[] = [];
	for (const item of raw) {
		const parsed = GeossitFeatureSchema.safeParse(item);
		if (parsed.success) features.push(parsed.data);
		else
			skipped.push({
				id: (item as { properties?: { id_geossitio?: unknown } })?.properties
					?.id_geossitio,
				reason: z.prettifyError(parsed.error),
			});
	}

	const nameCounts = new Map<string, number>();
	for (const f of features) {
		const base = slugify(f.properties.nome);
		nameCounts.set(base, (nameCounts.get(base) ?? 0) + 1);
	}

	const geosites: GeossitImportResult["geosites"] = [];
	for (const f of features) {
		const base = slugify(f.properties.nome);
		const slug =
			(nameCounts.get(base) ?? 0) > 1 || base.length < 3
				? `${base}-${f.properties.id_geossitio}`.replace(/^-/, "")
				: base;
		try {
			geosites.push(GeositeInputSchema.parse(toGeositeInput(f, slug, places)));
		} catch (err) {
			skipped.push({
				id: f.properties.id_geossitio,
				reason: err instanceof z.ZodError ? z.prettifyError(err) : String(err),
			});
		}
	}
	return { geosites, skipped };
}
