/**
 * Data behind the trip-planning agent's tools (`agent/tools/*`). Server-only.
 * Nothing here returns coordinates except trip stops, and those are public
 * points (rounded ~1 km for sensitive sites), exactly what `/trip` shows.
 */
import type { Filter } from "mongodb";
import {
	findNearbyGeosites,
	type GeositeDoc,
	geositesCollection,
	publicPoint,
	searchGeosites,
} from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import { dayMeters } from "~/features/trip/itineraries";
import { pathMeters } from "~/features/trip/route";
import type { TripStop } from "~/features/trip/schemas";
import { findItineraries } from "~/features/trip/trip.server";
import {
	type AgentGeosite,
	type AgentGeositeDetail,
	type SearchGeositesInput,
	SearchGeositesInputSchema,
	type TripProposal,
} from "./schemas";

type AgentDoc = Pick<
	GeositeDoc,
	| "slug"
	| "name"
	| "municipality"
	| "state"
	| "geoparkId"
	| "categories"
	| "relevance"
	| "scores"
	| "degradationRisk"
	| "locationIsApproximate"
	| "locationIsSensitive"
>;

const AGENT_FIELDS = {
	_id: 0,
	slug: 1,
	name: 1,
	municipality: 1,
	state: 1,
	geoparkId: 1,
	categories: 1,
	relevance: 1,
	scores: 1,
	degradationRisk: 1,
	locationIsApproximate: 1,
	locationIsSensitive: 1,
} as const;

/** A geosite document → what the model sees. Pure. */
export function toAgentGeosite(d: AgentDoc): AgentGeosite {
	return {
		slug: d.slug,
		name: d.name,
		municipality: d.municipality,
		state: d.state,
		...(d.geoparkId && { geoparkId: d.geoparkId as GeoparkId }),
		categories: d.categories,
		relevance: d.relevance,
		...(d.scores && {
			tourism: d.scores.tourism,
			didactic: d.scores.didactic,
			scientific: d.scores.scientific,
		}),
		...(d.degradationRisk && { degradationRisk: d.degradationRisk }),
		locationIsApproximate: !!d.locationIsApproximate,
		locationIsSensitive: !!d.locationIsSensitive,
	};
}

/** Cuts long text at a sentence or word boundary. Pure. */
export function trimText(text: string, max: number): string {
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	const sentence = cut.lastIndexOf(". ");
	const end = sentence > max * 0.6 ? sentence + 1 : cut.lastIndexOf(" ");
	return `${cut.slice(0, end > 0 ? end : max).trimEnd()}…`;
}

/** Best tourism mark first, then name. */
const byTourism = (a: AgentGeosite, b: AgentGeosite) =>
	(b.tourism ?? -1) - (a.tourism ?? -1) || a.name.localeCompare(b.name, "pt");

export async function findAgentGeosites(
	input: SearchGeositesInput,
): Promise<AgentGeosite[]> {
	const { query, geoparkId, state, categories, minTourism, limit } =
		SearchGeositesInputSchema.parse(input);
	const filter: Filter<GeositeDoc> = {
		...(geoparkId && { geoparkId }),
		...(state && { state }),
		...(categories?.length && { categories: { $in: categories } }),
		...(minTourism && { "scores.tourism": { $gte: minTourism } }),
	};
	if (query) {
		// The search box's matching (text index + substring), then the filters.
		const hits = await searchGeosites(query, 50);
		filter.slug = { $in: hits.map((h) => h.slug) };
	}
	const docs = await (await geositesCollection())
		.find<AgentDoc>(filter, { projection: AGENT_FIELDS })
		.toArray();
	return docs.map(toAgentGeosite).sort(byTourism).slice(0, limit);
}

export async function findAgentGeosite(
	slug: string,
): Promise<AgentGeositeDetail | null> {
	const d = await (await geositesCollection()).findOne(
		{ slug },
		{
			projection: {
				...AGENT_FIELDS,
				summary: 1,
				description: 1,
				geologicAge: 1,
				protectedAreas: 1,
			},
		},
	);
	if (!d) return null;
	return {
		...toAgentGeosite(d),
		summary: d.summary,
		...(d.description && { description: trimText(d.description, 1_500) }),
		...(d.geologicAge?.period && { period: d.geologicAge.period }),
		...(d.geologicAge?.formation && { formation: d.geologicAge.formation }),
		protectedAreas: (d.protectedAreas ?? []).map((a) => a.name),
		path: `/geosites/${d.slug}`,
	};
}

/** Nearby geosites; distances already rounded between public points. */
export async function findAgentNearby(slug: string) {
	const nearby = await findNearbyGeosites(slug, 8);
	return nearby?.map((g) => ({
		slug: g.slug,
		name: g.name,
		municipality: g.municipality,
		state: g.state,
		categories: g.categories,
		locationIsApproximate: g.locationIsApproximate,
		distanceKm: Math.round(g.distanceMeters / 100) / 10,
	}));
}

/** Suggested itineraries as slugs, names and km per day. */
export async function findAgentItineraries(query: {
	gp?: GeoparkId;
	uf?: string;
}) {
	const { oneDay, twoDays } = await findItineraries(
		query.gp ? { gp: query.gp } : { uf: query.uf ?? "" },
	);
	const day = (stops: TripStop[]) => ({
		stops: stops.map(({ slug, name, municipality }) => ({
			slug,
			name,
			municipality,
		})),
		km: Math.round(dayMeters(stops) / 1_000),
	});
	return { oneDay: day(oneDay), twoDays: twoDays.map(day) };
}

type StopDoc = Pick<
	GeositeDoc,
	| "slug"
	| "name"
	| "municipality"
	| "state"
	| "geoparkId"
	| "location"
	| "locationIsSensitive"
	| "locationIsApproximate"
>;

/**
 * Slugs → the trip card: stops in the given order, with public points.
 * Unknown slugs and approximate points (a municipality's centre would send
 * people to the wrong place) are skipped and reported. Pure.
 */
export function buildProposal(
	slugs: string[],
	docs: StopDoc[],
	meta: { title: string; notes?: string },
): TripProposal {
	const bySlug = new Map(docs.map((d) => [d.slug, d]));
	const stops: TripStop[] = [];
	const skipped: string[] = [];
	for (const slug of new Set(slugs)) {
		const d = bySlug.get(slug);
		if (!d || d.locationIsApproximate) {
			skipped.push(slug);
			continue;
		}
		stops.push({
			slug: d.slug,
			name: d.name,
			municipality: d.municipality,
			state: d.state,
			...(d.geoparkId && { geoparkId: d.geoparkId as GeoparkId }),
			point: publicPoint(d),
			approximate: d.locationIsSensitive,
		});
	}
	return {
		title: meta.title,
		...(meta.notes && { notes: meta.notes }),
		stops,
		totalKm: Math.round(pathMeters(stops.map((s) => s.point)) / 1_000),
		skipped,
	};
}

export async function proposeTrip(input: {
	title: string;
	stops: string[];
	notes?: string;
}): Promise<TripProposal> {
	const docs = await (await geositesCollection())
		.find<StopDoc>(
			{ slug: { $in: input.stops } },
			{
				projection: {
					_id: 0,
					slug: 1,
					name: 1,
					municipality: 1,
					state: 1,
					geoparkId: 1,
					location: 1,
					locationIsSensitive: 1,
					locationIsApproximate: 1,
				},
			},
		)
		.toArray();
	return buildProposal(input.stops, docs, input);
}
