/**
 * The trip as GPX and KML files for GPS and map apps. Pure and built on the
 * device, like the rest of the trip: stops carry public points only
 * (rounded ~1 km for sensitive geosites), never the traveller's position.
 */

export type ExportStop = {
	name: string;
	/** [longitude, latitude], the stop's public point. */
	point: readonly [number, number];
	description: string;
	url: string;
};

const escapeXml = (s: string) =>
	s.replace(
		/[<>&"']/g,
		(c) =>
			({
				"<": "&lt;",
				">": "&gt;",
				"&": "&amp;",
				'"': "&quot;",
				"'": "&apos;",
			})[c] as string,
	);

const deg = (n: number) => n.toFixed(6);

/** GPX 1.1: a waypoint per stop, plus the stops in order as a route. */
export function tripGpx(title: string, stops: ExportStop[]): string {
	const t = escapeXml(title);
	const wpt = stops.map(({ name, point: [lng, lat], description, url }) =>
		[
			`  <wpt lat="${deg(lat)}" lon="${deg(lng)}">`,
			`    <name>${escapeXml(name)}</name>`,
			`    <desc>${escapeXml(description)}</desc>`,
			`    <link href="${escapeXml(url)}"><text>${escapeXml(name)}</text></link>`,
			"  </wpt>",
		].join("\n"),
	);
	const rtept = stops.map(
		({ name, point: [lng, lat] }) =>
			`    <rtept lat="${deg(lat)}" lon="${deg(lng)}"><name>${escapeXml(name)}</name></rtept>`,
	);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<gpx version="1.1" creator="GeoparqueBR" xmlns="http://www.topografix.com/GPX/1/1">',
		`  <metadata><name>${t}</name></metadata>`,
		...wpt,
		"  <rte>",
		`    <name>${t}</name>`,
		...rtept,
		"  </rte>",
		"</gpx>",
		"",
	].join("\n");
}

/** KML 2.2: a placemark per stop and a line joining them in order. */
export function tripKml(title: string, stops: ExportStop[]): string {
	const t = escapeXml(title);
	const coords = (p: readonly [number, number]) => `${deg(p[0])},${deg(p[1])}`;
	const placemarks = stops.map(({ name, point, description, url }) =>
		[
			"    <Placemark>",
			`      <name>${escapeXml(name)}</name>`,
			`      <description>${escapeXml(`${description}\n${url}`)}</description>`,
			`      <Point><coordinates>${coords(point)}</coordinates></Point>`,
			"    </Placemark>",
		].join("\n"),
	);
	const line =
		stops.length > 1
			? [
					"    <Placemark>",
					`      <name>${t}</name>`,
					"      <LineString><tessellate>1</tessellate>",
					`        <coordinates>${stops.map((s) => coords(s.point)).join(" ")}</coordinates>`,
					"      </LineString>",
					"    </Placemark>",
				]
			: [];
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<kml xmlns="http://www.opengis.net/kml/2.2">',
		"  <Document>",
		`    <name>${t}</name>`,
		...placemarks,
		...line,
		"  </Document>",
		"</kml>",
		"",
	].join("\n");
}

/** Saves `text` as a file on the device. Browser only. */
export function downloadFile(filename: string, type: string, text: string) {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
