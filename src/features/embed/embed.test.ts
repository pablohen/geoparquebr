import { describe, expect, it } from "vitest";
import { geoparkEmbedPath, geositeEmbedPath, iframeSnippet } from "./embed";

describe("iframeSnippet", () => {
	it("builds a lazy, borderless iframe with escaped attributes", () => {
		const html = iframeSnippet(
			"https://geoparquebr.vercel.app/embed/geoparks/serido",
			'Mapa de "Seridó" & cia',
		);
		expect(html).toBe(
			'<iframe src="https://geoparquebr.vercel.app/embed/geoparks/serido" title="Mapa de &quot;Seridó&quot; &amp; cia" width="100%" height="450" style="border:0;border-radius:8px" loading="lazy" allowfullscreen></iframe>',
		);
	});

	it("has paths for geoparks and geosites", () => {
		expect(geoparkEmbedPath("araripe")).toBe("/embed/geoparks/araripe");
		expect(geositeEmbedPath("pedra-cariri")).toBe(
			"/embed/geosites/pedra-cariri",
		);
	});
});
