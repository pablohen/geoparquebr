/** RSS 2.0 for the "Novidades" page. Pure. */
import type { ChangeRun } from "./schemas";

const escapeXml = (s: string) =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

export type FeedText = {
	title: string;
	description: string;
	language: string;
	/** Absolute URL of the page. */
	link: string;
	/** Absolute URL of a geosite page. */
	geositeUrl: (slug: string) => string;
	runTitle: (run: ChangeRun) => string;
	added: (count: number) => string;
	changed: (count: number) => string;
	removed: (count: number) => string;
	fieldLabel: (field: ChangeRun["changed"][number]["fields"][number]) => string;
};

/** One item per sync run, newest first; its body lists the geosites. */
export function newsFeedXml(runs: ChangeRun[], t: FeedText): string {
	const list = (items: string[]) =>
		items.length > 0
			? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`
			: "";
	const link = (slug: string, name: string) =>
		`<a href="${escapeXml(t.geositeUrl(slug))}">${escapeXml(name)}</a>`;

	const items = runs.map((run) => {
		const body = [
			run.added.length > 0 &&
				`<p>${escapeXml(t.added(run.added.length))}</p>${list(run.added.map((g) => link(g.slug, g.name)))}`,
			run.changed.length > 0 &&
				`<p>${escapeXml(t.changed(run.changed.length))}</p>${list(
					run.changed.map(
						(g) =>
							`${link(g.slug, g.name)} (${escapeXml(g.fields.map(t.fieldLabel).join(", "))})`,
					),
				)}`,
			run.removed.length > 0 &&
				`<p>${escapeXml(t.removed(run.removed.length))}</p>${list(run.removed.map((g) => escapeXml(g.name)))}`,
		]
			.filter(Boolean)
			.join("");
		return [
			"<item>",
			`<title>${escapeXml(t.runTitle(run))}</title>`,
			`<link>${escapeXml(`${t.link}#${run.id}`)}</link>`,
			`<guid isPermaLink="false">${run.id}</guid>`,
			`<pubDate>${new Date(run.at).toUTCString()}</pubDate>`,
			`<description>${escapeXml(body)}</description>`,
			"</item>",
		].join("");
	});

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<rss version="2.0"><channel>',
		`<title>${escapeXml(t.title)}</title>`,
		`<link>${escapeXml(t.link)}</link>`,
		`<description>${escapeXml(t.description)}</description>`,
		`<language>${t.language}</language>`,
		...items,
		"</channel></rss>",
	].join("\n");
}
