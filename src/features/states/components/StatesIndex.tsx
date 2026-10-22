import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { GeositeStats } from "~/features/stats/schemas";
import { m } from "~/paraglide/messages.js";
import { stateName, UFS, type Uf } from "../states";

/** Every state with GEOSSIT geosites, by name, each linking to its page. */
export function StatesIndex({ stats }: { stats: GeositeStats }) {
	const counts = new Map(stats.states.map((s) => [s.key, s.count]));
	const byName = (a: Uf, b: Uf) =>
		stateName(a).localeCompare(stateName(b), "pt");
	const withGeosites = UFS.filter((uf) => counts.has(uf)).sort(byName);
	const without = UFS.filter((uf) => !counts.has(uf)).sort(byName);

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.states_title()}
				</Title>
				<Text c="dimmed">{m.states_intro()}</Text>
			</Stack>
			<SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
				{withGeosites.map((uf) => (
					<Card
						key={uf}
						withBorder
						radius="md"
						padding="sm"
						renderRoot={(props) => (
							<Link
								{...props}
								to="/states/$uf"
								params={{ uf: uf.toLowerCase() }}
							/>
						)}
					>
						<Group justify="space-between" gap="xs" wrap="nowrap">
							<Text fw={600} size="sm">
								{stateName(uf)}
							</Text>
							<Text size="xs" c="dimmed">
								{uf}
							</Text>
						</Group>
						<Text size="sm" c="dimmed">
							{m.timeline_geosites_count({ count: counts.get(uf) ?? 0 })}
						</Text>
					</Card>
				))}
			</SimpleGrid>
			{without.length > 0 && (
				<Text size="sm" c="dimmed">
					{m.states_without({
						names: without.map(stateName).join(", "),
					})}
				</Text>
			)}
		</Stack>
	);
}
