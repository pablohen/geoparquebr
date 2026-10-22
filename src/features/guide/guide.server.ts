/** Server-only queries for the printable field guides. */
import QRCode from "qrcode";
import {
	type GeositeDoc,
	geositesCollection,
	publicPoint,
} from "~/features/geosites/geosites.server";
import type { GeoparkId } from "~/features/geosites/schemas";
import { geositePath } from "~/features/geosites/seo";
import type { Locale } from "~/lib/i18n";
import { absoluteUrl } from "~/lib/site";
import type { GuideEntry } from "./schemas";

const PROJECTION = {
	slug: 1,
	name: 1,
	municipality: 1,
	state: 1,
	geoparkId: 1,
	categories: 1,
	relevance: 1,
	geologicAge: 1,
	summary: 1,
	description: 1,
	location: 1,
	locationIsSensitive: 1,
	locationIsApproximate: 1,
	source: 1,
} as const;

async function toEntry(d: GeositeDoc, locale: Locale): Promise<GuideEntry> {
	const pageUrl = absoluteUrl(geositePath(d.slug), locale);
	return {
		slug: d.slug,
		name: d.name,
		municipality: d.municipality,
		state: d.state,
		...(d.geoparkId && { geoparkId: d.geoparkId }),
		categories: d.categories,
		relevance: d.relevance,
		...(d.geologicAge && { geologicAge: d.geologicAge }),
		text: d.description ?? d.summary,
		point: publicPoint(d),
		approximate: d.locationIsSensitive || !!d.locationIsApproximate,
		...(d.source?.url && { sourceUrl: d.source.url }),
		pageUrl,
		qrSvg: await QRCode.toString(pageUrl, {
			type: "svg",
			margin: 0,
			errorCorrectionLevel: "M",
		}),
	};
}

/** Guide entries for these geosites, in the order given. */
export async function findGuideEntries(
	slugs: string[],
	locale: Locale,
): Promise<GuideEntry[]> {
	const docs = await (await geositesCollection())
		.find({ slug: { $in: slugs } }, { projection: PROJECTION })
		.toArray();
	const bySlug = new Map(docs.map((d) => [d.slug, d]));
	const ordered = slugs.flatMap((s) => {
		const d = bySlug.get(s);
		return d ? [d] : [];
	});
	return Promise.all(ordered.map((d) => toEntry(d, locale)));
}

/** Guide entries for a geopark's geosites, by name. */
export async function findGeoparkGuide(
	id: GeoparkId,
	locale: Locale,
): Promise<GuideEntry[]> {
	const docs = await (await geositesCollection())
		.find({ geoparkId: id }, { projection: PROJECTION })
		.sort({ name: 1 })
		.toArray();
	return Promise.all(docs.map((d) => toEntry(d, locale)));
}
