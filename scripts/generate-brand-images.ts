/**
 * Renders the share card (Open Graph) and PWA icons from SVG into public/.
 * Usage: pnpm brand:images   (re-run after changing the artwork; commit the PNGs)
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(process.cwd(), "public");
const BG = "#1f1f22";
const ORANGE = "#ea7a3a";
const LIGHT = "#fde4d6";

/** The mountain mark from favicon.svg, drawn in a 32×32 box. */
const mark = `
	<path d="M3 25 12 10l5 8 4-5 8 12z" fill="${ORANGE}"/>
	<path d="M12 10l2.6 4.2-2.6 1.6-2.4-1.6z" fill="${LIGHT}"/>`;

/** Square icon; `padding` keeps the mark inside the maskable safe zone. */
function iconSvg(size: number, padding: number, rounded: boolean) {
	const inner = size - padding * 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	<rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="${BG}"/>
	<g transform="translate(${padding} ${padding}) scale(${inner / 32})">${mark}</g>
</svg>`;
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
	<defs>
		<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#26262b"/>
			<stop offset="1" stop-color="#151517"/>
		</linearGradient>
	</defs>
	<rect width="1200" height="630" fill="url(#g)"/>
	<g opacity="0.12" transform="translate(620 120) scale(18)">${mark}</g>
	<g transform="translate(90 170) scale(4.2)">${mark}</g>
	<text x="90" y="380" font-family="Inter, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#ffffff">GeoparqueBR</text>
	<text x="92" y="450" font-family="Inter, Helvetica, Arial, sans-serif" font-size="38" fill="#cfcfd4">Geossítios, fósseis e geologia do Brasil</text>
	<text x="92" y="540" font-family="Inter, Helvetica, Arial, sans-serif" font-size="26" fill="${ORANGE}">geoparquebr.vercel.app</text>
</svg>`;

const outputs: [file: string, svg: string][] = [
	["og-default.png", ogSvg],
	["icons/icon-192.png", iconSvg(192, 24, true)],
	["icons/icon-512.png", iconSvg(512, 64, true)],
	// Maskable icons are cropped to a circle/squircle: full bleed, 20% padding.
	["icons/maskable-512.png", iconSvg(512, 112, false)],
	["icons/apple-touch-icon.png", iconSvg(180, 22, false)],
];

await mkdir(join(OUT, "icons"), { recursive: true });
for (const [file, svg] of outputs) {
	const png = await sharp(Buffer.from(svg))
		.png({ compressionLevel: 9 })
		.toBuffer();
	await writeFile(join(OUT, file), png);
	console.log(`public/${file} (${Math.round(png.byteLength / 1024)} KB)`);
}
