import type { MantineColor } from "@mantine/core";
import type { GeositeCategory } from "../schemas";

export const CATEGORY_COLORS = {
	paleontological: "orange",
	geomorphological: "teal",
	speleological: "violet",
	stratigraphic: "yellow",
	mineralogical: "pink",
	petrological: "gray",
	hydrogeological: "blue",
	tectonic: "red",
} as const satisfies Record<GeositeCategory, MantineColor>;

export function formatDistance(meters: number): string {
	return meters < 1_000
		? `${Math.round(meters)} m`
		: `${(meters / 1_000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}
