import type { MantineColor } from "@mantine/core";
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

export function formatDistance(meters: number): string {
	return meters < 1_000
		? `${Math.round(meters)} m`
		: `${(meters / 1_000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
