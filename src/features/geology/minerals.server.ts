/**
 * SGB's mineral occurrences around a tapped point, from the same ArcGIS
 * service the map overlay draws (`MINERALS_SERVICE`). These are SGB's public
 * mine and prospect records, unrelated to protected geosites.
 */
import { z } from "zod";
import { MINERALS_SERVICE } from "~/features/geosites/overlays";
import { haversineMeters } from "~/lib/geo";
import {
	MINERALS_AT_POINT_MAX,
	type MineralOccurrence,
	MineralOccurrenceSchema,
} from "./schemas";

const FIELDS = [
	"ID_OCORRENCIA",
	"TOPONIMIA",
	"MUNICIPIO",
	"UF",
	"SUBSTANCIAS",
	"STATUS_ECONOMICO",
	"IMPORTANCIA",
	"SITUACAO_MINA",
	"SITUACAO_GARIMPO",
	"CLASSES_UTILITARIAS",
	"ROCHAS_HOSPEDEIRAS",
	"PROVINCIA",
] as const;

const text = z
	.string()
	.nullish()
	.transform((s) => s?.trim() || undefined)
	.catch(undefined);

const FeatureSchema = z.object({
	attributes: z.object({
		ID_OCORRENCIA: z.number().int(),
		TOPONIMIA: text,
		MUNICIPIO: text,
		UF: text,
		SUBSTANCIAS: text,
		STATUS_ECONOMICO: text,
		IMPORTANCIA: text,
		SITUACAO_MINA: text,
		SITUACAO_GARIMPO: text,
		CLASSES_UTILITARIAS: text,
		ROCHAS_HOSPEDEIRAS: text,
		PROVINCIA: text,
	}),
	geometry: z.object({ x: z.number(), y: z.number() }),
});

const ResponseSchema = z.object({ features: z.array(z.unknown()) });

/** "Não identificada" and the like say nothing; drop them. */
const known = (s: string | undefined) =>
	s && !/^n[ãa]o (identificad|informad)/i.test(s) ? s : undefined;

/**
 * Valid features, nearest to `point` first; bad records are skipped. The
 * mine/garimpo situation is kept only for the status it belongs to (SGB
 * fills both fields).
 */
export function parseMineralFeatures(
	raw: unknown,
	point: [number, number],
): { items: MineralOccurrence[]; total: number } {
	const { features } = ResponseSchema.parse(raw);
	const items = features.flatMap((f): MineralOccurrence[] => {
		const parsed = FeatureSchema.safeParse(f);
		if (!parsed.success) return [];
		const a = parsed.data.attributes;
		const { x, y } = parsed.data.geometry;
		const status = a.STATUS_ECONOMICO;
		const activity = /garimpo/i.test(status ?? "")
			? a.SITUACAO_GARIMPO
			: /mina/i.test(status ?? "")
				? a.SITUACAO_MINA
				: undefined;
		return [
			MineralOccurrenceSchema.parse({
				id: a.ID_OCORRENCIA,
				name: a.TOPONIMIA,
				municipality: a.MUNICIPIO,
				state: a.UF,
				substances: a.SUBSTANCIAS,
				status,
				importance: a.IMPORTANCIA,
				activity,
				useClass: a.CLASSES_UTILITARIAS,
				hostRocks: known(a.ROCHAS_HOSPEDEIRAS),
				province: a.PROVINCIA,
				distanceM: Math.round(haversineMeters(point, [x, y]) / 10) * 10,
			}),
		];
	});
	items.sort((a, b) => a.distanceM - b.distanceM);
	return { items: items.slice(0, MINERALS_AT_POINT_MAX), total: items.length };
}

/** Occurrences within `radiusDeg` of `point` (a box, then nearest first). */
export async function sgbMineralsNear(
	point: [number, number],
	radiusDeg: number,
) {
	const [lng, lat] = point;
	const url = new URL(`${MINERALS_SERVICE}/0/query`);
	url.search = new URLSearchParams({
		geometry: [
			lng - radiusDeg,
			lat - radiusDeg,
			lng + radiusDeg,
			lat + radiusDeg,
		]
			.map((v) => v.toFixed(6))
			.join(","),
		geometryType: "esriGeometryEnvelope",
		inSR: "4326",
		spatialRel: "esriSpatialRelIntersects",
		outFields: FIELDS.join(","),
		returnGeometry: "true",
		outSR: "4326",
		f: "json",
	}).toString();
	const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error(`SGB minerals: HTTP ${res.status}`);
	return parseMineralFeatures(await res.json(), point);
}
