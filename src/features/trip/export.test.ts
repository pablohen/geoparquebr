import { describe, expect, it } from "vitest";
import { type ExportStop, tripGpx, tripKml } from "./export";

const stops: ExportStop[] = [
	{
		name: "Pedra Cariri",
		point: [-39.7, -7.1],
		description: "Nova Olinda – CE",
		url: "https://geoparquebr.vercel.app/geosites/pedra-cariri",
	},
	{
		name: 'Lajedo <Soledade> & "Cia"',
		point: [-37.8123456, -5.5],
		description: "Apodi – RN",
		url: "https://geoparquebr.vercel.app/geosites/lajedo?a=1&b=2",
	},
];

describe("tripGpx", () => {
	const gpx = tripGpx("Meu roteiro", stops);

	it("writes a waypoint per stop, lat/lon in GPX order", () => {
		expect(gpx).toContain('<wpt lat="-7.100000" lon="-39.700000">');
		expect(gpx.match(/<wpt /g)).toHaveLength(2);
	});

	it("keeps the stops' order in the route", () => {
		const route = gpx.slice(gpx.indexOf("<rte>"));
		expect(route.indexOf("Pedra Cariri")).toBeLessThan(route.indexOf("Lajedo"));
	});

	it("escapes names and URLs", () => {
		expect(gpx).toContain("Lajedo &lt;Soledade&gt; &amp; &quot;Cia&quot;");
		expect(gpx).toContain("lajedo?a=1&amp;b=2");
		expect(gpx).not.toContain("<Soledade>");
	});

	it("rounds coordinates to 6 decimals", () => {
		expect(gpx).toContain('lon="-37.812346"');
	});
});

describe("tripKml", () => {
	it("writes placemarks with lng,lat and a line in order", () => {
		const kml = tripKml("Meu roteiro", stops);
		expect(kml.match(/<Point>/g)).toHaveLength(2);
		expect(kml).toContain("<coordinates>-39.700000,-7.100000</coordinates>");
		expect(kml).toContain(
			"<coordinates>-39.700000,-7.100000 -37.812346,-5.500000</coordinates>",
		);
	});

	it("draws no line for a single stop", () => {
		expect(tripKml("x", stops.slice(0, 1))).not.toContain("LineString");
	});
});
