import { describe, expect, it } from "vitest";
import { type FeedText, newsFeedXml } from "./feed";

const t: FeedText = {
	title: "Novidades",
	description: "O que mudou",
	language: "pt-BR",
	link: "https://example.org/news",
	geositeUrl: (slug) => `https://example.org/geosites/${slug}`,
	runTitle: () => "Sincronização de 20 de outubro",
	added: (n) => `Novos (${n})`,
	changed: (n) => `Atualizados (${n})`,
	removed: (n) => `Removidos (${n})`,
	fieldLabel: (f) => f,
};

describe("newsFeedXml", () => {
	it("writes one escaped item per run", () => {
		const xml = newsFeedXml(
			[
				{
					id: "abc123",
					at: "2026-10-19T06:00:00.000Z",
					added: [{ slug: "pedra-cariri", name: "Pedra <Cariri> & cia" }],
					changed: [
						{
							slug: "mina-brejui",
							name: "Mina Brejui",
							fields: ["photo", "name"],
						},
					],
					removed: [{ name: "Gone" }],
				},
			],
			t,
		);
		expect(xml).toContain('<rss version="2.0">');
		expect(xml).toContain('<guid isPermaLink="false">abc123</guid>');
		expect(xml).toContain("<pubDate>Mon, 19 Oct 2026 06:00:00 GMT</pubDate>");
		expect(xml).toContain("<link>https://example.org/news#abc123</link>");
		// The body is HTML escaped once inside <description>; names twice.
		expect(xml).toContain("Pedra &amp;lt;Cariri&amp;gt; &amp;amp; cia");
		expect(xml).toContain("(photo, name)");
		expect(xml).not.toMatch(/<description>[^<]*<ul>/);
	});

	it("is a valid empty channel without runs", () => {
		expect(newsFeedXml([], t)).toMatch(/<channel>[\s\S]*<\/channel><\/rss>$/);
	});

	it("puts extra items, like the geosite of the day, before the runs", () => {
		const xml = newsFeedXml(
			[
				{
					id: "run1",
					at: "2026-10-19T06:00:00.000Z",
					added: [],
					changed: [],
					removed: [{ name: "Gone" }],
				},
			],
			t,
			[
				{
					id: "geosite-of-the-day-2026-10-22",
					title: "Geossítio do dia: Pedra & cia",
					link: "https://example.org/geosites/pedra",
					at: "2026-10-22T03:00:00.000Z",
					description: "Resumo <curto>",
				},
			],
		);
		expect(xml.indexOf("geosite-of-the-day-2026-10-22")).toBeLessThan(
			xml.indexOf("run1"),
		);
		expect(xml).toContain("<title>Geossítio do dia: Pedra &amp; cia</title>");
		expect(xml).toContain("<description>Resumo &lt;curto&gt;</description>");
	});
});
