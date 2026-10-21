/**
 * Brazil's UNESCO Global Geoparks: designation years and map framing.
 * Pure and isomorphic. Names and descriptions are messages (labels.ts).
 */

import type { GeoparkId } from "~/features/geosites/schemas";
import type { BBox } from "~/lib/geo";

export type GeoparkInfo = {
	/** Year UNESCO designated it a Global Geopark. */
	designated: number;
	/**
	 * Approximate box around the geopark's municipalities, only to frame the
	 * map ("Ver no mapa"); not its legal boundary.
	 */
	area: BBox;
};

/** Ordered by designation, oldest first. */
export const GEOPARKS = {
	araripe: { designated: 2006, area: [-40.1, -7.45, -39.0, -6.95] },
	serido: { designated: 2022, area: [-37.2, -6.75, -36.2, -5.9] },
	"caminhos-dos-canions-do-sul": {
		designated: 2022,
		area: [-50.3, -29.5, -49.6, -28.8],
	},
	"quarta-colonia": {
		designated: 2023,
		area: [-53.65, -29.85, -53.05, -29.25],
	},
	cacapava: { designated: 2023, area: [-53.9, -30.95, -53.1, -30.3] },
	uberaba: { designated: 2024, area: [-48.3, -20.0, -47.6, -19.5] },
} as const satisfies Record<GeoparkId, GeoparkInfo>;

export const geoparkPath = (id: GeoparkId) => `/geoparks/${id}`;
