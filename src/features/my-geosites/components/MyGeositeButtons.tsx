import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { CheckCircle, Star } from "@phosphor-icons/react";
import type { Geosite } from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";
import { useMyGeosites } from "../store";

/** Star (favourite) and tick (visited) for one geosite, saved on this device. */
export function MyGeositeButtons({ geosite }: { geosite: Geosite }) {
	const { state, toggleFavourite, toggleVisited } = useMyGeosites();
	const entry = state[geosite.slug];
	const favourite = entry?.favourite === true;
	const visited = entry?.visitedAt !== undefined;
	const favLabel = favourite ? m.my_favourite_remove() : m.my_favourite_add();
	const visitLabel = visited ? m.my_visited_remove() : m.my_visited_add();
	return (
		<Group gap={6}>
			<Tooltip label={favLabel} withinPortal>
				<ActionIcon
					variant={favourite ? "light" : "default"}
					color={favourite ? "yellow" : undefined}
					size={30}
					aria-label={favLabel}
					aria-pressed={favourite}
					onClick={() => toggleFavourite(geosite)}
				>
					<Star size={16} weight={favourite ? "fill" : "regular"} />
				</ActionIcon>
			</Tooltip>
			<Tooltip label={visitLabel} withinPortal>
				<ActionIcon
					variant={visited ? "light" : "default"}
					color={visited ? "teal" : undefined}
					size={30}
					aria-label={visitLabel}
					aria-pressed={visited}
					onClick={() => toggleVisited(geosite)}
				>
					<CheckCircle size={16} weight={visited ? "fill" : "regular"} />
				</ActionIcon>
			</Tooltip>
		</Group>
	);
}
