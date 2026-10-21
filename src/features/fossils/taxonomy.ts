/**
 * Turning fossil names as recorded (SGB, GBIF) into GBIF backbone genera.
 * Pure, so it can be tested without the network.
 */
import { z } from "zod";
import { tidyCase } from "~/features/geology/taxa";

/**
 * The part of a recorded name worth matching: genus, plus the epithet when
 * there is one. "dastilbe elongatus santos, 1947" → "Dastilbe elongatus",
 * "Cladocyclus sp." → "Cladocyclus", "Restos vegetais" → "Restos vegetais"
 * (GBIF finds no match for it). Undefined when it can't be a Latin name.
 */
export function matchQuery(recorded: string): string | undefined {
	const words = recorded
		.split(",")[0]
		?.trim()
		.replace(/\s+(cf|aff)\.?\s+/i, " ")
		.split(/\s+/);
	const genus = words?.[0];
	if (!genus || !/^\p{L}{3,}$/u.test(genus)) return undefined;
	const epithet = words[1];
	const name = tidyCase(genus.toLowerCase());
	return epithet &&
		/^\p{Ll}{3,}$/u.test(epithet) &&
		!/^(sp|spp|indet)$/.test(epithet)
		? `${name} ${epithet}`
		: name;
}

const text = z
	.string()
	.nullish()
	.transform((s) => s ?? undefined);

/** GBIF `species/match` response, the fields we use. */
export const GbifMatchSchema = z.object({
	matchType: z.enum(["EXACT", "FUZZY", "HIGHERRANK", "NONE"]).catch("NONE"),
	rank: text,
	status: text,
	canonicalName: text,
	species: text,
	genus: text,
	genusKey: z.number().int().nullish(),
	family: text,
	order: text,
	class: text,
	phylum: text,
	kingdom: text,
});

export const TaxonMatchSchema = z.object({
	genus: z.string(),
	genusKey: z.number().int(),
	/** Accepted species name, when the record named one. */
	species: z.string().optional(),
	kingdom: z.string().optional(),
	phylum: z.string().optional(),
	class: z.string().optional(),
	order: z.string().optional(),
	family: z.string().optional(),
});
export type TaxonMatch = z.infer<typeof TaxonMatchSchema>;

const SPECIES_RANKS = new Set(["SPECIES", "SUBSPECIES", "VARIETY", "FORM"]);

/**
 * Keeps exact matches at genus rank or below. Fuzzy matches are dropped:
 * recorded names include Portuguese descriptions ("Restos vegetais") that
 * fuzzy matching would turn into unrelated genera. A species unknown to the
 * backbone comes back as HIGHERRANK with its genus; that genus is kept when
 * it is the one recorded.
 */
export function acceptMatch(query: string, raw: unknown): TaxonMatch | null {
	const parsed = GbifMatchSchema.safeParse(raw);
	if (!parsed.success) return null;
	const m = parsed.data;
	if (!m.genus || m.genusKey == null) return null;
	const isSpecies = m.rank !== undefined && SPECIES_RANKS.has(m.rank);
	const recordedGenus = query.split(" ")[0]?.toLowerCase();
	const ok =
		(m.matchType === "EXACT" && (m.rank === "GENUS" || isSpecies)) ||
		(m.matchType === "HIGHERRANK" &&
			m.rank === "GENUS" &&
			m.genus.toLowerCase() === recordedGenus);
	if (!ok) return null;
	return {
		genus: m.genus,
		genusKey: m.genusKey,
		species:
			isSpecies && m.matchType === "EXACT"
				? (m.species ?? m.canonicalName)
				: undefined,
		kingdom: m.kingdom,
		phylum: m.phylum,
		class: m.class,
		order: m.order,
		family: m.family,
	};
}

/** URL slug for a genus: "Dastilbe" → "dastilbe". */
export const genusSlug = (genus: string) =>
	genus
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/æ/g, "ae")
		.replace(/œ/g, "oe")
		.replace(/[^a-z]/g, "");
