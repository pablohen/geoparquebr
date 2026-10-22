import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	type AgeRange,
	type BBox,
	BRAZIL_BBOX,
	type GeoparkId,
	type GeositeCategory,
	type Relevance,
} from "~/features/geosites/schemas";
import type { Uf } from "~/features/states/states";

type MapSearch = {
	/** Only these states' geosites, outlined on the map. */
	uf?: Uf[];
	cat?: [GeositeCategory];
	rel?: Relevance;
	gp?: GeoparkId;
	age?: AgeRange;
};

/** A link that opens the map with this filter on, over all of Brazil by default. */
export function MapLink({
	search,
	children,
	size = "sm",
	bbox = BRAZIL_BBOX,
}: {
	search: MapSearch;
	children: ReactNode;
	size?: string;
	bbox?: BBox;
}) {
	return (
		<Anchor
			size={size}
			renderRoot={(props) => (
				<Link {...props} to="/" search={{ bbox: [...bbox], ...search }} />
			)}
		>
			{children}
		</Anchor>
	);
}
