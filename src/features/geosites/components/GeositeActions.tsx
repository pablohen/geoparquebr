import { Anchor, Button, Group } from "@mantine/core";
import {
	ArrowSquareOut,
	MapTrifold,
	NavigationArrow,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { EmbedButton } from "~/features/embed/components/EmbedButton";
import { geositeEmbedPath } from "~/features/embed/embed";
import { MyGeositeButtons } from "~/features/my-geosites/components/MyGeositeButtons";
import { TripButton, TripLink } from "~/features/trip/components/TripButton";
import { toStop } from "~/features/trip/store";
import { bboxAround, roundBBox } from "~/lib/geo";
import { m } from "~/paraglide/messages.js";
import type { Geosite } from "../schemas";
import { directionsUrl, geositeMeta } from "../seo";
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
			<MyGeositeButtons geosite={geosite} />
			<TripButton stop={toStop(geosite)} />
			<ShareButton
				url={meta.url}
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
						? m.actions_directions_approximate_title()
						: undefined
				}
			>
				{geosite.locationIsSensitive
					? m.actions_directions_approximate()
					: m.actions_directions()}
			</Button>
			{context === "page" ? (
				<>
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
						{m.actions_view_on_map()}
					</Button>
					<EmbedButton
						size="xs"
						path={geositeEmbedPath(geosite.slug)}
						name={geosite.name}
					/>
				</>
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
					{m.actions_geosite_page()} <ArrowSquareOut size={12} />
				</Anchor>
			)}
			<TripLink />
		</Group>
	);
}
