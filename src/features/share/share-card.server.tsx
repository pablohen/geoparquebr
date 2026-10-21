/**
 * Open Graph images (1200×630) for geosite and geopark pages. Satori lays the
 * JSX out as SVG, resvg (WebAssembly) turns it into PNG. The wasm and fonts
 * are inlined as base64 into this module's chunk, which only the /og routes
 * load (by dynamic import). Labels follow the request's locale.
 *
 * No photos: a photo makes the PNG ~0.5 MB, and WhatsApp drops preview
 * images over ~300 KB. Text-only cards stay around 50 KB.
 *
 * Never draw a map or coordinates here: sensitive sites must not be located.
 */
import interRegular from "@fontsource/inter/files/inter-latin-400-normal.woff?base64";
import interBold from "@fontsource/inter/files/inter-latin-700-normal.woff?base64";
import { DEFAULT_THEME, type MantineColor } from "@mantine/core";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm?base64";
import type { ReactNode } from "react";
import satori from "satori";
import { GEOPARKS } from "~/features/geoparks/geoparks";
import { countGeositesByGeopark } from "~/features/geoparks/geoparks.server";
import { geoparkAbout } from "~/features/geoparks/labels";
import { CATEGORY_COLORS } from "~/features/geosites/components/categoryStyle";
import { findGeositeBySlug } from "~/features/geosites/geosites.server";
import {
	categoryLabel,
	geoparkIdLabel,
	geoparkLabel,
	relevanceLabel,
} from "~/features/geosites/labels";
import type { GeoparkId, Geosite } from "~/features/geosites/schemas";
import { truncate } from "~/features/geosites/seo";
import { SITE_NAME, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const BG = "#1f1f22";
const ORANGE = "#ea7a3a";
const DIM = "#a6a7ab";
const PAD = 64;
const BAR = 14;

const bytes = (base64: string) => Buffer.from(base64, "base64");
const fonts = [
	{ name: "Inter", data: bytes(interRegular), weight: 400, style: "normal" },
	{ name: "Inter", data: bytes(interBold), weight: 700, style: "normal" },
] as const;

// resvg's wasm can be initialised once per process; dev reloads re-run this module.
const resvgReady = Symbol.for("geoparquebr.resvgReady");
const flags = globalThis as { [resvgReady]?: Promise<void> };

async function toPng(node: ReactNode): Promise<Uint8Array<ArrayBuffer>> {
	flags[resvgReady] ??= initWasm(bytes(resvgWasm));
	await flags[resvgReady];
	const svg = await satori(node, {
		width: CARD_WIDTH,
		height: CARD_HEIGHT,
		fonts: [...fonts],
	});
	return new Uint8Array(
		new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } })
			.render()
			.asPng(),
	);
}

/** A Mantine colour name as hex (shade 6), for satori, which has no theme. */
const hex = (color: MantineColor) => DEFAULT_THEME.colors[color]?.[6] ?? ORANGE;

/** The mountain mark from favicon.svg. */
function Mark({ size }: { size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
			<path d="M3 25 12 10l5 8 4-5 8 12z" fill={ORANGE} />
			<path d="M12 10l2.6 4.2-2.6 1.6-2.4-1.6z" fill="#fde4d6" />
		</svg>
	);
}

function Frame({
	accent,
	children,
	footer,
}: {
	accent: string;
	children: ReactNode;
	footer: ReactNode;
}) {
	return (
		<div
			style={{
				width: CARD_WIDTH,
				height: CARD_HEIGHT,
				display: "flex",
				background: BG,
				borderTop: `${BAR}px solid ${accent}`,
				fontFamily: "Inter",
				color: "#fff",
			}}
		>
			<div
				style={{
					position: "absolute",
					left: PAD,
					top: PAD - BAR,
					width: CARD_WIDTH - 2 * PAD,
					height: CARD_HEIGHT - 2 * PAD,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div style={{ display: "flex", alignItems: "center" }}>
					<Mark size={44} />
					<div
						style={{
							fontSize: 30,
							fontWeight: 700,
							color: ORANGE,
							marginLeft: 12,
						}}
					>
						{SITE_NAME}
					</div>
				</div>
				{children}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						marginTop: "auto",
						fontSize: 24,
						color: DIM,
					}}
				>
					{footer}
				</div>
			</div>
		</div>
	);
}

const host = new URL(SITE_URL).host;

/** The card for a geosite page, or null when there's no such geosite. */
export async function geositeCard(
	slug: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
	const g = await findGeositeBySlug(slug);
	return g ? renderGeositeCard(g) : null;
}

/** The geosite card itself, from the public record (no coordinates drawn). */
export function renderGeositeCard(
	g: Geosite,
): Promise<Uint8Array<ArrayBuffer>> {
	const first = g.categories[0];
	return toPng(
		<Frame
			accent={first ? hex(CATEGORY_COLORS[first]) : ORANGE}
			footer={
				<>
					<div style={{ display: "flex" }}>{geoparkLabel(g)}</div>
					<div style={{ display: "flex", color: ORANGE, marginTop: 8 }}>
						{host}
					</div>
				</>
			}
		>
			<div
				style={{
					display: "flex",
					fontSize: 68,
					fontWeight: 700,
					lineHeight: 1.1,
					marginTop: 48,
				}}
			>
				{truncate(g.name, 70)}
			</div>
			<div style={{ display: "flex", fontSize: 32, color: DIM, marginTop: 16 }}>
				{`${g.municipality} – ${g.state}`}
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", marginTop: 28 }}>
				{g.categories.slice(0, 3).map((c) => (
					<div
						key={c}
						style={{
							display: "flex",
							fontSize: 22,
							fontWeight: 700,
							color: hex(CATEGORY_COLORS[c]),
							border: `2px solid ${hex(CATEGORY_COLORS[c])}`,
							borderRadius: 999,
							padding: "6px 18px",
							marginRight: 12,
							marginBottom: 12,
						}}
					>
						{categoryLabel(c).toUpperCase()}
					</div>
				))}
			</div>
			<div style={{ display: "flex", fontSize: 24, color: DIM }}>
				{relevanceLabel(g.relevance)}
			</div>
		</Frame>,
	);
}

/** The card for a geopark page. */
export async function geoparkCard(
	id: GeoparkId,
): Promise<Uint8Array<ArrayBuffer>> {
	const counts = await countGeositesByGeopark();
	return renderGeoparkCard(id, counts[id] ?? 0);
}

/** The geopark card itself, given how many GEOSSIT geosites it has. */
export function renderGeoparkCard(
	id: GeoparkId,
	geositeCount: number,
): Promise<Uint8Array<ArrayBuffer>> {
	return toPng(
		<Frame
			accent={ORANGE}
			footer={
				<>
					<div style={{ display: "flex" }}>
						{m.geopark_geosites_count({ count: geositeCount })}
					</div>
					<div style={{ display: "flex", color: ORANGE, marginTop: 8 }}>
						{host}
					</div>
				</>
			}
		>
			<div
				style={{
					display: "flex",
					fontSize: 64,
					fontWeight: 700,
					lineHeight: 1.1,
					marginTop: 48,
				}}
			>
				{geoparkIdLabel(id)}
			</div>
			<div
				style={{ display: "flex", fontSize: 30, color: ORANGE, marginTop: 16 }}
			>
				{m.geopark_designated({ year: GEOPARKS[id].designated })}
			</div>
			<div
				style={{
					display: "flex",
					fontSize: 30,
					color: "#d5d6da",
					lineHeight: 1.35,
					marginTop: 24,
				}}
			>
				{truncate(geoparkAbout(id), 170)}
			</div>
		</Frame>,
	);
}
