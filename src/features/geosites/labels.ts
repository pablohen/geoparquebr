/**
 * Display labels for geosite enum values, in the current locale. Enum values
 * stay English slugs; these map them to messages (messages/{locale}.json).
 */
import { m } from "~/paraglide/messages.js";
import type {
	DegradationRisk,
	GeoparkId,
	Geosite,
	GeositeCategory,
	GeositeScores,
	ModelProvenance,
	Relevance,
} from "./schemas";

type Labels<K extends string> = Record<K, () => string>;

const CATEGORY = {
	paleontological: m.category_paleontological,
	paleoenvironmental: m.category_paleoenvironmental,
	geomorphological: m.category_geomorphological,
	speleological: m.category_speleological,
	stratigraphic: m.category_stratigraphic,
	sedimentological: m.category_sedimentological,
	mineralogical: m.category_mineralogical,
	petrological: m.category_petrological,
	igneous: m.category_igneous,
	metamorphic: m.category_metamorphic,
	tectonic: m.category_tectonic,
	hydrogeological: m.category_hydrogeological,
	metallogenic: m.category_metallogenic,
	pedological: m.category_pedological,
	impact: m.category_impact,
	marine: m.category_marine,
	historical: m.category_historical,
} satisfies Labels<GeositeCategory>;

const GEOPARK = {
	araripe: m.geopark_araripe,
	serido: m.geopark_serido,
	"caminhos-dos-canions-do-sul": m.geopark_caminhos_dos_canions_do_sul,
	"quarta-colonia": m.geopark_quarta_colonia,
	cacapava: m.geopark_cacapava,
	uberaba: m.geopark_uberaba,
} satisfies Labels<GeoparkId>;

const RELEVANCE = {
	international: m.relevance_international,
	national: m.relevance_national,
	geodiversity: m.relevance_geodiversity,
} satisfies Labels<Relevance>;

const DEGRADATION_RISK = {
	low: m.risk_low,
	medium: m.risk_medium,
	high: m.risk_high,
} satisfies Labels<DegradationRisk>;

const SCORE = {
	scientific: m.score_scientific,
	tourism: m.score_tourism,
	didactic: m.score_didactic,
	vulnerability: m.score_vulnerability,
} satisfies Labels<keyof GeositeScores>;

const PROVENANCE = {
	locality: m.provenance_locality,
	region: m.provenance_region,
	illustrative: m.provenance_illustrative,
} satisfies Labels<ModelProvenance>;

export const categoryLabel = (c: GeositeCategory) => CATEGORY[c]();
export const geoparkIdLabel = (id: GeoparkId) => GEOPARK[id]();
export const relevanceLabel = (r: Relevance) => RELEVANCE[r]();
export const degradationRiskLabel = (r: DegradationRisk) =>
	DEGRADATION_RISK[r]();
export const scoreLabel = (s: keyof GeositeScores) => SCORE[s]();
export const provenanceNote = (p: ModelProvenance) => PROVENANCE[p]();

/** Score keys in display order. */
export const SCORE_KEYS = Object.keys(SCORE) as (keyof GeositeScores)[];

/** The geopark a geosite belongs to, a proposed one, or neither. */
export function geoparkLabel(g: Geosite): string {
	if (g.geoparkId) return geoparkIdLabel(g.geoparkId);
	if (g.geoparkProposal) return m.geopark_proposal({ name: g.geoparkProposal });
	return m.geopark_none();
}
