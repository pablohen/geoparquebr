/**
 * Favourite and visited geosites, kept on this device (localStorage) so they
 * work offline and need no account. Each entry keeps a small snapshot of the
 * geosite, so "Meus geossítios" can list it without the network.
 */
import { z } from "zod";
import {
	GeoparkIdSchema,
	type Geosite,
	SlugSchema,
} from "~/features/geosites/schemas";
import { createLocalStore } from "~/lib/local-store";

export const MyGeositeSchema = z.object({
	slug: SlugSchema,
	name: z.string().min(1).max(200),
	municipality: z.string().max(120),
	state: z.string().max(2),
	geoparkId: GeoparkIdSchema.optional(),
	favourite: z.boolean().default(false),
	visitedAt: z.iso.datetime().optional(),
	updatedAt: z.iso.datetime(),
});
export type MyGeosite = z.infer<typeof MyGeositeSchema>;

export type MyGeosites = Record<string, MyGeosite>;

const STORAGE_KEY = "geoparquebr:my-geosites:v1";
const EMPTY: MyGeosites = Object.freeze({}) as MyGeosites;

type GeositeRef = Pick<
	Geosite,
	"slug" | "name" | "municipality" | "state" | "geoparkId"
>;

/** Stored JSON → entries, dropping any that don't validate. */
export function parseMyGeosites(raw: string | null): MyGeosites {
	if (!raw) return EMPTY;
	try {
		const data = JSON.parse(raw) as Record<string, unknown>;
		const out: MyGeosites = {};
		for (const value of Object.values(data)) {
			const entry = MyGeositeSchema.safeParse(value);
			if (entry.success) out[entry.data.slug] = entry.data;
		}
		return out;
	} catch {
		return EMPTY;
	}
}

function update(
	state: MyGeosites,
	g: GeositeRef,
	change: Partial<Pick<MyGeosite, "favourite" | "visitedAt">>,
	now: Date,
): MyGeosites {
	const previous = state[g.slug];
	const entry: MyGeosite = {
		favourite: false,
		...previous,
		slug: g.slug,
		name: g.name,
		municipality: g.municipality,
		state: g.state,
		geoparkId: g.geoparkId,
		...change,
		updatedAt: now.toISOString(),
	};
	const { [g.slug]: _, ...rest } = state;
	// Nothing left to remember: drop the entry.
	return entry.favourite || entry.visitedAt
		? { ...rest, [g.slug]: entry }
		: rest;
}

export const setFavourite = (
	state: MyGeosites,
	g: GeositeRef,
	favourite: boolean,
	now = new Date(),
) => update(state, g, { favourite }, now);

export const setVisited = (
	state: MyGeosites,
	g: GeositeRef,
	visited: boolean,
	now = new Date(),
) =>
	update(
		state,
		g,
		{
			visitedAt: visited
				? (state[g.slug]?.visitedAt ?? now.toISOString())
				: undefined,
		},
		now,
	);

const store = createLocalStore(STORAGE_KEY, parseMyGeosites, EMPTY);

/** This device's favourites and visits; empty during SSR and hydration. */
export function useMyGeosites() {
	const state = store.use();
	return {
		state,
		toggleFavourite: (g: GeositeRef) =>
			store.write(
				setFavourite(store.read(), g, !store.read()[g.slug]?.favourite),
			),
		toggleVisited: (g: GeositeRef) =>
			store.write(
				setVisited(store.read(), g, !store.read()[g.slug]?.visitedAt),
			),
	};
}
