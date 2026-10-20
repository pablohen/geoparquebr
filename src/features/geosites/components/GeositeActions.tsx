import { Anchor, Button, Group } from "@mantine/core";
import {
	ArrowSquareOut,
	MapTrifold,
	NavigationArrow,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { bboxAround, roundBBox } from "~/lib/geo";
import { absoluteUrl } from "~/lib/site";
import type { Geosite } from "../schemas";
import { directionsUrl, geositeMeta, geositePath } from "../seo";
import { ShareButton } from "./ShareButton";

type Props = {
	geosite: Geosite;
	/** "page" links back to the map; "drawer" links out to the standalone page. */
	context: "page" | "drawer";
};

/** Share, directions and map/page links for one geosite. */
export function GeositeActions({ geosite, context }: Props) {
	const meta = geositeMeta(geosite);
	return (
		<Group gap="xs">
			<ShareButton
				url={absoluteUrl(geositePath(geosite.slug))}
				title={geosite.name}
				text={meta.description}
			/>
			<Button
				component="a"
				href={directionsUrl(geosite.location.coordinates)}
				target="_blank"
				rel="noreferrer"
				size="xs"
				variant="default"
				leftSection={<NavigationArrow size={14} />}
				title={
					geosite.locationIsSensitive
						? "Localização aproximada (sítio protegido)"
						: undefined
				}
			>
				Como chegar{geosite.locationIsSensitive && " (aprox.)"}
			</Button>
			{context === "page" ? (
				<Button
					// renderRoot keeps TanStack Link's typed `search`.
					renderRoot={(props) => (
						<Link
							{...props}
							to="/"
							search={{
								site: geosite.slug,
								bbox: roundBBox(bboxAround(geosite.location.coordinates, 15)),
							}}
						/>
					)}
					size="xs"
					variant="default"
					leftSection={<MapTrifold size={14} />}
				>
					Ver no mapa
				</Button>
			) : (
				<Anchor
					renderRoot={(props) => (
						<Link
							{...props}
							to="/geosites/$slug"
							params={{ slug: geosite.slug }}
						/>
					)}
					size="xs"
				>
					Página do geossítio <ArrowSquareOut size={12} />
				</Anchor>
			)}
		</Group>
	);
}
