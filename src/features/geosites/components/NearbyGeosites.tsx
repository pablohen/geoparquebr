import { Badge, Group, Loader, NavLink, Stack, Text } from "@mantine/core";
import { CaretRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { getNearbyGeosites } from "../geosites.functions";
import { categoryLabel } from "../labels";
import type { GeositeSummary } from "../schemas";
import { CATEGORY_COLORS, formatDistance } from "./categoryStyle";

type Props = {
	slug: string;
	/** In the map drawer: open the geosite there. Without it, link to its page. */
	onSelect?: (slug: string) => void;
};

/** "Perto daqui": the closest other geosites, nearest first. */
export function NearbyGeosites({ slug, onSelect }: Props) {
	const query = useServerQuery(`nearby:${slug}`, () =>
		getNearbyGeosites({ data: { slug } }),
	);

	let body: ReactNode;
	if (query.status === "error")
		body = (
			<Text size="sm" c="dimmed">
				{m.nearby_error()}
			</Text>
		);
	else if (query.status !== "success") body = <Loader size="sm" type="dots" />;
	else if (query.data.length === 0)
		body = (
			<Text size="sm" c="dimmed">
				{m.nearby_none()}
			</Text>
		);
	else
		body = (
			<Stack gap={2} mx="-sm">
				{query.data.map((g) => (
					<NearbyItem key={g.id} geosite={g} onSelect={onSelect} />
				))}
				{query.data.some((g) => g.locationIsSensitive) && (
					<Text size="xs" c="dimmed" mt={4} px="sm">
						{m.nearby_approximate()}
					</Text>
				)}
			</Stack>
		);

	return (
		<Stack gap={6}>
			<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
				{m.nearby_title()}
			</Text>
			{body}
		</Stack>
	);
}

function NearbyItem({
	geosite: g,
	onSelect,
}: {
	geosite: GeositeSummary;
	onSelect?: (slug: string) => void;
}) {
	const category = g.categories[0];
	const props = {
		label: (
			<Text size="sm" fw={600} lineClamp={1}>
				{g.name}
			</Text>
		),
		description: (
			<Group gap={6} wrap="nowrap" mt={2}>
				<Text size="xs" c="dimmed" lineClamp={1}>
					{g.municipality} – {g.state}
				</Text>
				{category && (
					// Phones keep the room for the municipality.
					<Badge
						size="xs"
						variant="light"
						color={CATEGORY_COLORS[category]}
						visibleFrom="sm"
						style={{ flex: "none" }}
					>
						{categoryLabel(category)}
					</Badge>
				)}
			</Group>
		),
		rightSection: (
			<Group gap={4} wrap="nowrap">
				<Text size="xs" c="dimmed" ff="monospace">
					{g.locationIsSensitive && "~"}
					{formatDistance(g.distanceMeters)}
				</Text>
				<CaretRight size={14} />
			</Group>
		),
		styles: { root: { borderRadius: "var(--mantine-radius-md)" } },
	};
	return onSelect ? (
		<NavLink {...props} component="button" onClick={() => onSelect(g.slug)} />
	) : (
		<NavLink
			{...props}
			renderRoot={(root) => (
				<Link {...root} to="/geosites/$slug" params={{ slug: g.slug }} />
			)}
		/>
	);
}
