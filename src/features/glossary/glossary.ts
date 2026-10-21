/**
 * The glossary's entries, by section. Copy lives in messages; this file only
 * orders it and names the anchors other pages link to (`/glossary#…`).
 */
import { categoryLabel, scoreLabel } from "~/features/geosites/labels";
import {
	GEOSITE_CATEGORIES,
	type GeositeCategory,
	type GeositeScores,
} from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";

export const GLOSSARY_PATH = "/glossary";

export type GlossaryEntry = {
	/** Anchor id on the page. */
	id: string;
	term: () => string;
	definition: () => string;
};

export type GlossarySection = {
	id: string;
	title: () => string;
	entries: GlossaryEntry[];
};

export const themeAnchor = (c: GeositeCategory) => `theme-${c}`;
export const scoreAnchor = (k: keyof GeositeScores) => `score-${k}`;

const CATEGORY_DEFINITIONS = {
	paleontological: m.glossary_cat_paleontological,
	paleoenvironmental: m.glossary_cat_paleoenvironmental,
	geomorphological: m.glossary_cat_geomorphological,
	speleological: m.glossary_cat_speleological,
	stratigraphic: m.glossary_cat_stratigraphic,
	sedimentological: m.glossary_cat_sedimentological,
	mineralogical: m.glossary_cat_mineralogical,
	petrological: m.glossary_cat_petrological,
	igneous: m.glossary_cat_igneous,
	metamorphic: m.glossary_cat_metamorphic,
	tectonic: m.glossary_cat_tectonic,
	hydrogeological: m.glossary_cat_hydrogeological,
	metallogenic: m.glossary_cat_metallogenic,
	pedological: m.glossary_cat_pedological,
	impact: m.glossary_cat_impact,
	marine: m.glossary_cat_marine,
	historical: m.glossary_cat_historical,
} satisfies Record<GeositeCategory, () => string>;

const SCORE_DEFINITIONS = {
	scientific: m.glossary_def_score_scientific,
	tourism: m.glossary_def_score_tourism,
	didactic: m.glossary_def_score_didactic,
	vulnerability: m.glossary_def_score_vulnerability,
} satisfies Record<keyof GeositeScores, () => string>;

export const GLOSSARY: GlossarySection[] = [
	{
		id: "places",
		title: m.glossary_section_places,
		entries: [
			{
				id: "geosite",
				term: m.glossary_term_geosite,
				definition: m.glossary_def_geosite,
			},
			{
				id: "geodiversity-site",
				term: m.glossary_term_geodiversity_site,
				definition: m.glossary_def_geodiversity_site,
			},
			{
				id: "geodiversity",
				term: m.glossary_term_geodiversity,
				definition: m.glossary_def_geodiversity,
			},
			{
				id: "geopark",
				term: m.glossary_term_geopark,
				definition: m.glossary_def_geopark,
			},
			{
				id: "geossit",
				term: m.glossary_term_geossit,
				definition: m.glossary_def_geossit,
			},
			{
				id: "approximate",
				term: m.glossary_term_approximate,
				definition: m.glossary_def_approximate,
			},
		],
	},
	{
		id: "rocks",
		title: m.glossary_section_rocks,
		entries: [
			{
				id: "outcrop",
				term: m.glossary_term_outcrop,
				definition: m.glossary_def_outcrop,
			},
			{
				id: "formation",
				term: m.glossary_term_formation,
				definition: m.glossary_def_formation,
			},
			{
				id: "geologic-map",
				term: m.glossary_term_geologic_map,
				definition: m.glossary_def_geologic_map,
			},
			{
				id: "period",
				term: m.glossary_term_period,
				definition: m.glossary_def_period,
			},
			{
				id: "karst",
				term: m.glossary_term_karst,
				definition: m.glossary_def_karst,
			},
		],
	},
	{
		id: "fossils",
		title: m.glossary_section_fossils,
		entries: [
			{
				id: "fossil",
				term: m.glossary_term_fossil,
				definition: m.glossary_def_fossil,
			},
			{
				id: "ichnofossil",
				term: m.glossary_term_ichnofossil,
				definition: m.glossary_def_ichnofossil,
			},
			{
				id: "genus",
				term: m.glossary_term_genus,
				definition: m.glossary_def_genus,
			},
		],
	},
	{
		id: "assessment",
		title: m.glossary_section_assessment,
		entries: [
			...(Object.keys(SCORE_DEFINITIONS) as (keyof GeositeScores)[]).map(
				(k) => ({
					id: scoreAnchor(k),
					term: () => scoreLabel(k),
					definition: SCORE_DEFINITIONS[k],
				}),
			),
			{
				id: "degradation-risk",
				term: m.glossary_term_degradation_risk,
				definition: m.glossary_def_degradation_risk,
			},
		],
	},
	{
		id: "themes",
		title: m.glossary_section_themes,
		entries: GEOSITE_CATEGORIES.map((c) => ({
			id: themeAnchor(c),
			term: () => categoryLabel(c),
			definition: CATEGORY_DEFINITIONS[c],
		})),
	},
];
