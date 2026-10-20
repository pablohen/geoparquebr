import type { MantineColor } from "@mantine/core";
import { getLocale } from "~/paraglide/runtime.js";
import type { GeositeCategory } from "../schemas";

export const CATEGORY_COLORS = {
	paleontological: "orange",
	paleoenvironmental: "yellow",
	geomorphological: "teal",
	speleological: "violet",
	stratigraphic: "lime",
	sedimentological: "yellow",
	mineralogical: "pink",
	petrological: "gray",
	igneous: "red",
	metamorphic: "grape",
	tectonic: "red",
	hydrogeological: "blue",
	metallogenic: "indigo",
	pedological: "lime",
	impact: "dark",
	marine: "cyan",
	historical: "gray",
} as const satisfies Record<GeositeCategory, MantineColor>;

/** "850 m", "3,2 km" / "3.2 km", "42 km", in the current locale. */
export function formatDistance(meters: number): string {
	if (meters < 1_000) return `${Math.round(meters)} m`;
	const km = new Intl.NumberFormat(getLocale(), {
		maximumFractionDigits: meters < 10_000 ? 1 : 0,
	}).format(meters / 1_000);
	return `${km} km`;
}
