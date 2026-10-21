import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { geoparkLabel } from "~/features/geosites/labels";
import type { Geosite } from "~/features/geosites/schemas";

/** A geosite's geopark, linking to the geopark's page when it is in one. */
export function GeoparkName({ geosite }: { geosite: Geosite }) {
	const id = geosite.geoparkId;
	if (!id) return geoparkLabel(geosite);
	return (
		<Anchor
			inherit
			renderRoot={(props) => (
				<Link {...props} to="/geoparks/$geoparkId" params={{ geoparkId: id }} />
			)}
		>
			{geoparkLabel(geosite)}
		</Anchor>
	);
}
