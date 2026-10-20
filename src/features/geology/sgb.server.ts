/**
 * Client for the SGB/CPRM OGC API – Features server (pygeoapi).
 * The service describes itself as experimental, so every call is validated
 * and callers must handle failures.
 */
import { z } from "zod";
import { type BBox, haversineMeters } from "~/lib/geo";
import type { FossilOccurrence, StrataUnit } from "./schemas";
import { splitTaxa } from "./taxa";

export const SGB_OGC_API = "https://geoservicos.sgb.gov.br/ogcapi";

const text = z
	.string()
	.nullish()
	.transform((s) => s?.trim() || undefined);

function featureCollection<P extends z.ZodType>(properties: P) {
	return z.object({
		numberMatched: z.number().int().optional(),
		features: z.array(
			z.object({
				id: z.union([z.string(), z.number()]).optional(),
				// Points for occurrences; omitted entirely with skipGeometry.
				geometry: z
					.object({
						type: z.literal("Point"),
						coordinates: z.tuple([z.number(), z.number()]),
					})
					.nullish()
					.catch(null),
				properties,
			}),
		),
	});
}

export async function queryCollection<P extends z.ZodType>(
	collection: string,
	properties: P,
	params: {
		bbox: BBox;
		limit: number;
		skipGeometry?: boolean;
		fields?: string[];
	},
) {
	const url = new URL(`${SGB_OGC_API}/collections/${collection}/items`);
	url.search = new URLSearchParams({
		f: "json",
		bbox: params.bbox.join(","),
		limit: String(params.limit),
		...(params.skipGeometry && { skipGeometry: "true" }),
		...(params.fields && { properties: params.fields.join(",") }),
	}).toString();

	const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
	if (!res.ok) throw new Error(`SGB ${collection}: HTTP ${res.status}`);
	return featureCollection(properties).parse(await res.json());
}

// ---------------------------------------------------------------------------
// Fossil occurrences (geologia/ocorrencias-fossiliferas)
// ---------------------------------------------------------------------------

const FossilPropertiesSchema = z.object({
	identificacao: text,
	taxon: text,
	macrofosseis: text,
	microfosseis: text,
	unidade_litoestratigrafica: text,
	unidade_cronoestratigrafica: text,
	litologia: text,
	localidade: text,
	instituicao: text,
	registro_exemplar: text,
	status_exemplar: text,
	referencia_bibliografica: text,
});

/** An occurrence with its exact distance; rounding happens in the server function. */
export type NearbyFossil = Omit<FossilOccurrence, "distanceKm"> & {
	distanceM: number;
};

export async function sgbFossilsNear(
	point: [number, number],
	bbox: BBox,
	radiusKm: number,
): Promise<{ items: NearbyFossil[]; total: number }> {
	const page = await queryCollection(
		"geologia/ocorrencias-fossiliferas",
		FossilPropertiesSchema,
		{ bbox, limit: 500 },
	);

	const items = page.features.flatMap((f, i): NearbyFossil[] => {
		const p = f.properties;
		const taxa = splitTaxa(p.taxon, p.macrofosseis, p.microfosseis);
		if (!f.geometry || taxa.length === 0) return [];
		const distanceM = haversineMeters(point, f.geometry.coordinates);
		if (distanceM > radiusKm * 1_000) return [];
		return [
			{
				source: "sgb",
				id: p.identificacao ?? String(f.id ?? i),
				taxa,
				unit: p.unidade_litoestratigrafica,
				age: p.unidade_cronoestratigrafica,
				lithology: p.litologia,
				locality: p.localidade,
				institution: p.instituicao,
				specimen: p.registro_exemplar,
				typeStatus: p.status_exemplar,
				reference: p.referencia_bibliografica,
				distanceM,
			},
		];
	});
	return { items, total: items.length };
}

// ---------------------------------------------------------------------------
// Lithostratigraphy (geologia/litoestratigrafia/{scale})
// ---------------------------------------------------------------------------

/** Finest first; detailed maps only cover parts of Brazil, 1:1M covers all of it. */
const STRATA_SCALES = [25_000, 50_000, 100_000, 250_000, 1_000_000] as const;

const age = z.number().nonnegative().nullish().catch(null);

const StrataPropertiesSchema = z.object({
	sigla: z.string().trim().min(1),
	nome: z.string().trim().min(1),
	hierarquia: text,
	idade_min: age,
	idade_max: age,
	sistema_min: text,
	sistema_max: text,
	litotipos: text,
	legenda: text,
});

const STRATA_FIELDS = Object.keys(StrataPropertiesSchema.shape);

/**
 * Units mapped within the box at the most detailed scale that has any,
 * deduplicated by code and ordered youngest (top) → oldest (base).
 */
export async function sgbStrataIn(
	bbox: BBox,
): Promise<{ scale: number; units: StrataUnit[] }> {
	for (const scale of STRATA_SCALES) {
		const page = await queryCollection(
			`geologia/litoestratigrafia/${scale}`,
			z.unknown(),
			{ bbox, limit: 100, skipGeometry: true, fields: STRATA_FIELDS },
		);
		const units = new Map<string, StrataUnit>();
		for (const f of page.features) {
			const parsed = StrataPropertiesSchema.safeParse(f.properties);
			if (!parsed.success || units.has(parsed.data.sigla)) continue;
			const p = parsed.data;
			const periods = [
				...new Set([p.sistema_max, p.sistema_min].filter(Boolean)),
			];
			units.set(p.sigla, {
				code: p.sigla,
				name: p.nome,
				rank: p.hierarquia,
				minMa: p.idade_min ?? undefined,
				maxMa: p.idade_max ?? undefined,
				period: periods.length > 0 ? periods.join("–") : undefined,
				lithology: p.litotipos,
				description: p.legenda,
			});
		}
		if (units.size > 0)
			return {
				scale,
				units: [...units.values()].sort(
					(a, b) =>
						(a.minMa ?? Number.POSITIVE_INFINITY) -
							(b.minMa ?? Number.POSITIVE_INFINITY) ||
						(a.maxMa ?? 0) - (b.maxMa ?? 0),
				),
			};
	}
	return { scale: 1_000_000, units: [] };
}
