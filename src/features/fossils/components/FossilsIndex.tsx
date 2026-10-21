import { Anchor, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { FOSSIL_SEARCH_RADIUS_KM } from "~/features/geology/schemas";
import { m } from "~/paraglide/messages.js";
import type { FossilGenusSummary } from "../schemas";

type Props = { genera: FossilGenusSummary[] };

/** Every indexed genus, grouped by class (as named in the GBIF backbone). */
export function FossilsIndex({ genera }: Props) {
	const groups = new Map<string, FossilGenusSummary[]>();
	for (const g of genera) {
		const key = g.classification.class ?? g.classification.phylum ?? "";
		groups.set(key, [...(groups.get(key) ?? []), g]);
	}
	const sorted = [...groups.entries()].sort(
		([a, x], [b, y]) =>
			// Unclassified last, then the largest groups first.
			Number(a === "") - Number(b === "") ||
			y.length - x.length ||
			a.localeCompare(b),
	);

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.fossils_title()}
				</Title>
				<Text c="dimmed">
					{m.fossils_page_intro({ radiusKm: FOSSIL_SEARCH_RADIUS_KM })}
				</Text>
				<Text size="sm" c="dimmed">
					{m.fossils_genus_count({ count: genera.length })}
				</Text>
			</Stack>

			{genera.length === 0 && <Text c="dimmed">{m.fossils_empty()}</Text>}

			{sorted.map(([group, list]) => (
				<Stack key={group || "other"} gap="xs">
					<Title order={2} size="h4">
						{group || m.fossils_group_other()}
					</Title>
					<SimpleGrid
						cols={{ base: 2, sm: 3 }}
						spacing="xs"
						verticalSpacing="xs"
					>
						{list.map((g) => (
							<Stack key={g.slug} gap={0}>
								<Anchor
									renderRoot={(props) => (
										<Link
											{...props}
											to="/fossils/$genus"
											params={{ genus: g.slug }}
										/>
									)}
									fs="italic"
									fw={600}
									size="sm"
								>
									{g.name}
								</Anchor>
								<Text size="xs" c="dimmed">
									{m.fossils_geosites_count({ count: g.geositeCount })}
								</Text>
							</Stack>
						))}
					</SimpleGrid>
				</Stack>
			))}

			<Text size="xs" c="dimmed">
				{m.fossils_source_note()}
			</Text>
		</Stack>
	);
}
