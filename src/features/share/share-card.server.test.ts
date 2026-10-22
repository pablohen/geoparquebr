import { describe, expect, it } from "vitest";
import type { Geosite } from "~/features/geosites/schemas";
import {
	CARD_HEIGHT,
	CARD_WIDTH,
	renderGeoparkCard,
	renderGeositeCard,
	renderPageCard,
} from "./share-card.server";

/** Width and height from a PNG's IHDR chunk. */
function pngSize(png: Uint8Array) {
	const view = new DataView(png.buffer, png.byteOffset);
	return { width: view.getUint32(16), height: view.getUint32(20) };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const geosite: Geosite = {
	id: "1",
	slug: "pedra-cariri",
	name: "Pedra Cariri",
	summary: "",
	municipality: "Nova Olinda",
	state: "CE",
	categories: ["paleontological"],
	relevance: "international",
	location: { type: "Point", coordinates: [-39.69, -7.12] },
	models: [],
	locationIsSensitive: true,
	geoparkId: "araripe",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("share cards", () => {
	it("renders a geosite card as a 1200×630 PNG small enough for WhatsApp", async () => {
		const png = await renderGeositeCard(geosite);
		expect([...png.slice(0, 8)]).toEqual(PNG_SIGNATURE);
		expect(pngSize(png)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
		// WhatsApp drops preview images over ~300 KB.
		expect(png.byteLength).toBeLessThan(300_000);
	});

	it("renders a geopark card", async () => {
		const png = await renderGeoparkCard("serido", 3);
		expect(pngSize(png)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
		expect(png.byteLength).toBeLessThan(300_000);
	});

	it("renders a page card with every optional line", async () => {
		const png = await renderPageCard({
			eyebrow: "Unidade de rocha",
			title: "Formação Sousa",
			subtitle: "Cretáceo · 101–145 Ma",
			body: "Um texto ".repeat(40),
			footer: "10 geossítios",
		});
		expect(pngSize(png)).toEqual({ width: CARD_WIDTH, height: CARD_HEIGHT });
		expect(png.byteLength).toBeLessThan(300_000);
	});
});
