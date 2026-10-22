import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { GeositeStats } from "~/features/stats/schemas";
import { m } from "~/paraglide/messages.js";
import { regionLabel } from "../labels";
import { REGION_IDS, REGIONS, stateName, type Uf } from "../states";

/** Brazil's five regions, each with its geosite count and states. */
export function RegionsIndex({ stats }: { stats: GeositeStats }) {
	const counts = new Map(stats.states.map((s) => [s.key, s.count]));
	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.regions_title()}
				</Title>
				<Text c="dimmed">{m.regions_intro()}</Text>
			</Stack>
			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
				{REGION_IDS.map((r) => {
					const ufs: readonly Uf[] = REGIONS[r];
					const withGeosites = ufs.filter((uf) => counts.has(uf));
					const total = ufs.reduce((n, uf) => n + (counts.get(uf) ?? 0), 0);
					return (
						<Card
							key={r}
							withBorder
							radius="md"
							padding="md"
							renderRoot={(props) => (
								<Link {...props} to="/regions/$region" params={{ region: r }} />
							)}
						>
							<Text fw={700}>{regionLabel(r)}</Text>
							<Text size="sm" c="dimmed">
								{m.timeline_geosites_count({ count: total })} ·{" "}
								{m.region_states_count({ count: withGeosites.length })}
							</Text>
							<Text size="xs" c="dimmed" mt={4}>
								{withGeosites.map(stateName).join(", ")}
							</Text>
						</Card>
					);
				})}
			</SimpleGrid>
		</Stack>
	);
}
