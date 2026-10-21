import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	type AgeRange,
	BRAZIL_BBOX,
	type GeoparkId,
	type GeositeCategory,
	type Relevance,
} from "~/features/geosites/schemas";

type MapSearch = {
	cat?: [GeositeCategory];
	rel?: Relevance;
	gp?: GeoparkId;
	age?: AgeRange;
};

/** A link that opens the map over all of Brazil with this filter on. */
export function MapLink({
	search,
	children,
	size = "sm",
}: {
	search: MapSearch;
	children: ReactNode;
	size?: string;
}) {
	return (
		<Anchor
			size={size}
			renderRoot={(props) => (
				<Link
					{...props}
					to="/"
					search={{ bbox: [...BRAZIL_BBOX], ...search }}
				/>
			)}
		>
			{children}
		</Anchor>
	);
}
