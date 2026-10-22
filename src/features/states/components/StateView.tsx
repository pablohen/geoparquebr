import {
	Anchor,
	Badge,
	Box,
	Button,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { ArrowLeft, MapTrifold } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { GenusLinkList } from "~/features/fossils/components/GenusLinks";
import { periodLabel } from "~/features/geology/labels";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import {
	categoryLabel,
	geoparkIdLabel,
	relevanceLabel,
} from "~/features/geosites/labels";
import { BarList } from "~/features/stats/components/BarList";
import { MapLink } from "~/features/stats/components/MapLink";
import { Section } from "~/features/stats/components/Section";
import { SuggestedItineraries } from "~/features/trip/components/SuggestedItineraries";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import { regionLabel } from "../labels";
import type { StatePage } from "../schemas";
import { regionOf, stateName } from "../states";

const PERIOD_COLOR = Object.fromEntries(
	GEOLOGIC_PERIODS.map((p) => [p.id, p.color]),
);

/** One state: its geosites counted, the best rated, geoparks and fossils. */
export function StateView({ page }: { page: StatePage }) {
	const { uf, tally, bbox, top, geoparks, genera, geosites } = page;
	const international =
		tally.relevance.find((r) => r.key === "international")?.count ?? 0;

	return (
		<Stack gap="xl">
			<Anchor
				renderRoot={(props) => <Link {...props} to="/states" />}
				size="sm"
			>
				<Group gap={4}>
					<ArrowLeft size={14} aria-hidden />
					{m.state_all_states()}
				</Group>
			</Anchor>

			<Stack gap={6}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={600}>
					{m.state_eyebrow()} ·{" "}
					<Anchor
						inherit
						renderRoot={(props) => (
							<Link
								{...props}
								to="/regions/$region"
								params={{ region: regionOf(uf) }}
							/>
						)}
					>
						{m.region_of_state({ name: regionLabel(regionOf(uf)) })}
					</Anchor>
				</Text>
				<Title order={1} size="h2">
					{stateName(uf)} ({uf})
				</Title>
				<Text c="dimmed">
					{m.state_meta_description({
						name: stateName(uf),
						count: tally.total,
					})}
				</Text>
				<Group gap="xs" mt={4}>
					<Button
						variant="light"
						leftSection={<MapTrifold size={16} />}
						renderRoot={(props) => (
							<Link {...props} to="/" search={{ bbox: [...bbox], uf: [uf] }} />
						)}
					>
						{m.geopark_view_map()}
					</Button>
				</Group>
			</Stack>

			<SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
				<Tile value={tally.total} label={m.stats_tile_geosites()} />
				<Tile value={international} label={m.state_tile_international()} />
				<Tile value={geoparks.length} label={m.state_tile_geoparks()} />
				<Tile value={genera.length} label={m.stats_tile_genera()} />
			</SimpleGrid>

			{top.length > 0 && (
				<Section title={m.state_top()}>
					<Stack component="ol" gap={6} m={0} p={0}>
						{top.map((g) => (
							<Group
								component="li"
								key={g.slug}
								gap="sm"
								wrap="nowrap"
								style={{ listStyle: "none" }}
							>
								<Text fw={700} w={36} ta="right" style={{ flex: "none" }}>
									{m.rankings_rank({ rank: g.rank })}
								</Text>
								<Anchor
									size="sm"
									style={{ flex: 1, minWidth: 0 }}
									renderRoot={(props) => (
										<Link
											{...props}
											to="/geosites/$slug"
											params={{ slug: g.slug }}
										/>
									)}
								>
									{g.name}
								</Anchor>
								<Text size="sm" style={{ flex: "none" }}>
									{m.rankings_score_of({ score: g.scores.scientific })}
								</Text>
							</Group>
						))}
					</Stack>
					<Anchor
						size="sm"
						renderRoot={(props) => (
							<Link {...props} to="/rankings" search={{ uf }} />
						)}
					>
						{m.state_top_more()}
					</Anchor>
				</Section>
			)}

			<Section title={m.stats_by_category()} note={m.stats_category_note()}>
				<BarList
					label={m.stats_by_category()}
					bars={tally.categories.map(({ key, count }) => ({
						key,
						count,
						label: (
							<MapLink bbox={bbox} search={{ uf: [uf], cat: [key] }}>
								{categoryLabel(key)}
							</MapLink>
						),
					}))}
				/>
			</Section>

			{tally.dated > 0 && (
				<Section title={m.stats_by_period()}>
					<BarList
						label={m.stats_by_period()}
						bars={tally.periods
							.filter((p) => p.count > 0)
							.map(({ key, count }) => ({
								key,
								count,
								color: PERIOD_COLOR[key],
								label: (
									<MapLink bbox={bbox} search={{ uf: [uf], age: [key, key] }}>
										{periodLabel(key)}
									</MapLink>
								),
							}))}
					/>
				</Section>
			)}

			{geoparks.length > 0 && (
				<Section title={m.state_geoparks()}>
					<Group gap="md">
						{geoparks.map((id) => (
							<Anchor
								key={id}
								size="sm"
								renderRoot={(props) => (
									<Link
										{...props}
										to="/geoparks/$geoparkId"
										params={{ geoparkId: id }}
									/>
								)}
							>
								{geoparkIdLabel(id)}
							</Anchor>
						))}
					</Group>
				</Section>
			)}

			{tally.total > 1 && <SuggestedItineraries query={{ uf }} />}

			{genera.length > 0 && (
				<Section title={m.state_genera()}>
					<GenusLinkList genera={genera} />
				</Section>
			)}

			<Section title={m.state_geosites()}>
				<Stack component="ul" gap={6} m={0} p={0}>
					{geosites.map((g) => (
						<Box component="li" key={g.slug} style={{ listStyle: "none" }}>
							<Anchor
								size="sm"
								renderRoot={(props) => (
									<Link
										{...props}
										to="/geosites/$slug"
										params={{ slug: g.slug }}
									/>
								)}
							>
								{g.name}
							</Anchor>{" "}
							<Text span size="xs" c="dimmed">
								{g.municipality}
							</Text>{" "}
							{g.relevance === "international" && (
								<Badge size="xs" variant="light">
									{relevanceLabel(g.relevance)}
								</Badge>
							)}
						</Box>
					))}
				</Stack>
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
			<Text fz={28} fw={700} lh={1.1}>
				{value.toLocaleString(getLocale())}
			</Text>
			<Text size="sm" c="dimmed">
				{label}
			</Text>
		</Paper>
	);
}
