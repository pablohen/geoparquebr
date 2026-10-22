/**
 * Share cards for the state, region, rock unit and listing pages. Counts come
 * from the same reads as the pages; no coordinates are drawn.
 */

import { formatAgeRange } from "~/features/geology/time-scale";
import { regionLabel } from "~/features/states/labels";
import {
	type Region,
	regionOf,
	stateName,
	type Uf,
} from "~/features/states/states";
import { findRegionPage, findStatePage } from "~/features/states/states.server";
import { findUnit } from "~/features/units/units.server";
import { m } from "~/paraglide/messages.js";
import type { CardPage } from "./card-response";
import { renderPageCard } from "./share-card.server";

export async function stateCard(uf: Uf) {
	const page = await findStatePage(uf);
	if (!page) return null;
	return renderPageCard({
		eyebrow: m.state_eyebrow(),
		title: `${stateName(uf)} (${uf})`,
		subtitle: m.region_of_state({ name: regionLabel(regionOf(uf)) }),
		footer: m.timeline_geosites_count({ count: page.tally.total }),
	});
}

export async function regionCard(region: Region) {
	const page = await findRegionPage(region);
	if (!page) return null;
	return renderPageCard({
		eyebrow: m.region_eyebrow(),
		title: regionLabel(region),
		subtitle: page.states.map((s) => stateName(s.uf)).join(", "),
		footer: m.timeline_geosites_count({ count: page.tally.total }),
	});
}

export async function unitCard(slug: string) {
	const unit = await findUnit(slug);
	if (!unit) return null;
	const range = unit.age && formatAgeRange(unit.age.minMa, unit.age.maxMa);
	return renderPageCard({
		eyebrow: m.unit_eyebrow(),
		title: unit.name,
		subtitle: unit.age
			? [unit.age.period, range !== unit.age.period ? range : undefined]
					.filter(Boolean)
					.join(" · ")
			: undefined,
		footer: m.timeline_geosites_count({ count: unit.geositeCount }),
	});
}

/** Title and intro of each listing page, as its card. */
const PAGES: Record<CardPage, () => { title: string; body: string }> = {
	rankings: () => ({ title: m.rankings_title(), body: m.rankings_intro() }),
	conservation: () => ({
		title: m.conservation_title(),
		body: m.conservation_intro(),
	}),
	stats: () => ({ title: m.stats_title(), body: m.stats_intro() }),
	timeline: () => ({ title: m.timeline_title(), body: m.timeline_intro() }),
	glossary: () => ({ title: m.glossary_title(), body: m.glossary_intro() }),
	states: () => ({ title: m.states_title(), body: m.states_intro() }),
	regions: () => ({ title: m.regions_title(), body: m.regions_intro() }),
	units: () => ({ title: m.units_title(), body: m.units_intro() }),
	compare: () => ({ title: m.compare_title(), body: m.compare_intro() }),
	"data-quality": () => ({
		title: m.quality_title(),
		body: m.quality_intro(),
	}),
};

export function pageCard(page: CardPage) {
	const { title, body } = PAGES[page]();
	return renderPageCard({ eyebrow: m.card_eyebrow(), title, body });
}
