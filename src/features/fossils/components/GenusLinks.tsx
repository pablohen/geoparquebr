import { Anchor, Group, Stack, Text } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { getGeositeGenera } from "../fossils.functions";
import type { GenusLink } from "../schemas";

/** Genus names, italic, each linking to its fossil page. */
export function GenusLinkList({ genera }: { genera: GenusLink[] }) {
	return (
		<Group gap="xs">
			{genera.map((g) => (
				<Anchor
					key={g.slug}
					renderRoot={(props) => (
						<Link {...props} to="/fossils/$genus" params={{ genus: g.slug }} />
					)}
					size="sm"
					fs="italic"
				>
					{g.name}
				</Anchor>
			))}
		</Group>
	);
}

/** A titled list of genera; nothing when there are none. */
export function GenusLinks({
	title,
	genera,
}: {
	title: string;
	genera: GenusLink[];
}) {
	if (genera.length === 0) return null;
	return (
		<Stack gap={6}>
			<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
				{title}
			</Text>
			<GenusLinkList genera={genera} />
		</Stack>
	);
}

/** The genera recorded near one geosite, for its fossil tab. */
export function GeositeGenera({ slug }: { slug: string }) {
	const query = useServerQuery(`genera:${slug}`, () =>
		getGeositeGenera({ data: { slug } }),
	);
	return query.status === "success" ? (
		<GenusLinks title={m.fossils_genera_here()} genera={query.data} />
	) : null;
}
