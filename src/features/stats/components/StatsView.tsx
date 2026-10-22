import {
	Anchor,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	BookOpen,
	ChartBar,
	Clock,
	MapPin,
	Ranking,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { periodLabel } from "~/features/geology/labels";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import { categoryLabel, relevanceLabel } from "~/features/geosites/labels";
import { StateLink } from "~/features/states/components/StateLink";
import { UfSchema } from "~/features/states/schemas";
import { stateName, type Uf } from "~/features/states/states";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import type { GeositeStats } from "../schemas";
import { BarList } from "./BarList";
import { MapLink } from "./MapLink";
import { Section } from "./Section";

const PERIOD_COLOR = Object.fromEntries(
	GEOLOGIC_PERIODS.map((p) => [p.id, p.color]),
);

/** "Números": Brazil's GEOSSIT geosites counted by state, theme, relevance and age. */
export function StatsView({ stats }: { stats: GeositeStats }) {
	const locale = getLocale();
	const percent = (n: number) =>
		new Intl.NumberFormat(locale, { style: "percent" }).format(
			stats.total ? n / stats.total : 0,
		);
	const geoparkGeosites = stats.geoparks.reduce((n, g) => n + g.total, 0);

	return (
		<Stack gap="xl">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.stats_title()}
				</Title>
				<Text c="dimmed">{m.stats_intro()}</Text>
				<Group gap="md">
					<Anchor
						size="sm"
						renderRoot={(props) => <Link {...props} to="/timeline" />}
					>
						<Group gap={4}>
							<Clock size={14} aria-hidden />
							{m.timeline_link()}
						</Group>
					</Anchor>
					<Anchor
						size="sm"
						renderRoot={(props) => <Link {...props} to="/geoparks/compare" />}
					>
						<Group gap={4}>
							<ChartBar size={14} aria-hidden />
							{m.compare_link()}
						</Group>
					</Anchor>
					<Anchor
						size="sm"
						renderRoot={(props) => <Link {...props} to="/states" />}
					>
						<Group gap={4}>
							<MapPin size={14} aria-hidden />
							{m.states_link()}
						</Group>
					</Anchor>
					<Anchor
						size="sm"
						renderRoot={(props) => <Link {...props} to="/rankings" />}
					>
						<Group gap={4}>
							<Ranking size={14} aria-hidden />
							{m.rankings_link()}
						</Group>
					</Anchor>
					<Anchor
						size="sm"
						renderRoot={(props) => <Link {...props} to="/glossary" />}
					>
						<Group gap={4}>
							<BookOpen size={14} aria-hidden />
							{m.glossary_link()}
						</Group>
					</Anchor>
				</Group>
			</Stack>

			<SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
				<Tile value={stats.total} label={m.stats_tile_geosites()} />
				<Tile value={stats.states.length} label={m.stats_tile_states()} />
				<Tile
					value={geoparkGeosites}
					label={m.stats_tile_in_geoparks({
						share: percent(geoparkGeosites),
					})}
				/>
				<Tile value={stats.genera} label={m.stats_tile_genera()} />
			</SimpleGrid>

			<Section title={m.stats_by_relevance()}>
				<BarList
					label={m.stats_by_relevance()}
					max={stats.total}
					bars={stats.relevance.map(({ key, count }) => ({
						key,
						count,
						label: (
							<MapLink search={{ rel: key }}>{relevanceLabel(key)}</MapLink>
						),
					}))}
				/>
			</Section>

			<Section title={m.stats_by_category()} note={m.stats_category_note()}>
				<BarList
					label={m.stats_by_category()}
					bars={stats.categories.map(({ key, count }) => ({
						key,
						count,
						label: (
							<MapLink search={{ cat: [key] }}>{categoryLabel(key)}</MapLink>
						),
					}))}
				/>
			</Section>

			<Section
				title={m.stats_by_period()}
				note={m.stats_period_note({
					dated: stats.dated,
					share: percent(stats.dated),
				})}
			>
				<BarList
					label={m.stats_by_period()}
					bars={stats.periods
						.filter((p) => p.count > 0)
						.map(({ key, count }) => ({
							key,
							count,
							color: PERIOD_COLOR[key],
							label: (
								<MapLink search={{ age: [key, key] }}>
									{periodLabel(key)}
								</MapLink>
							),
						}))}
				/>
			</Section>

			<Section title={m.stats_by_state()}>
				<BarList
					label={m.stats_by_state()}
					bars={stats.states.map(({ key, count }) => ({
						key,
						count,
						label: (
							<StateLink uf={key}>
								{UfSchema.safeParse(key).success
									? `${stateName(key as Uf)} (${key})`
									: key}
							</StateLink>
						),
					}))}
				/>
			</Section>

			<Text size="xs" c="dimmed">
				{m.stats_source_note()}
			</Text>
		</Stack>
	);
}

function Tile({ value, label }: { value: number; label: string }) {
	return (
		<Paper withBorder radius="md" p="sm">
			<Text
				fz={28}
				fw={700}
				lh={1.1}
				style={{ fontVariantNumeric: "tabular-nums" }}
			>
				{value.toLocaleString(getLocale())}
			</Text>
			<Text size="sm" c="dimmed">
				{label}
			</Text>
		</Paper>
	);
}
