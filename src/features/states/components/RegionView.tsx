import {
	Anchor,
	Button,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Table,
	Text,
	Title,
} from "@mantine/core";
import { ArrowLeft, MapTrifold } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { GenusLinkList } from "~/features/fossils/components/GenusLinks";
import { periodLabel } from "~/features/geology/labels";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import { categoryLabel, geoparkIdLabel } from "~/features/geosites/labels";
import { BarList } from "~/features/stats/components/BarList";
import { MapLink } from "~/features/stats/components/MapLink";
import { Section } from "~/features/stats/components/Section";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import { regionLabel } from "../labels";
import type { RegionPage } from "../schemas";
import { REGIONS, stateName } from "../states";

const PERIOD_COLOR = Object.fromEntries(
	GEOLOGIC_PERIODS.map((p) => [p.id, p.color]),
);

/** One region: its states side by side, themes, ages, geoparks and fossils. */
export function RegionView({ page }: { page: RegionPage }) {
	const { region, tally, bbox, states, geoparks, genera } = page;
	const name = regionLabel(region);

	return (
		<Stack gap="xl">
			<Anchor
				renderRoot={(props) => <Link {...props} to="/regions" />}
				size="sm"
			>
				<Group gap={4}>
					<ArrowLeft size={14} aria-hidden />
					{m.region_all()}
				</Group>
			</Anchor>

			<Stack gap={6}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={600}>
					{m.region_eyebrow()}
				</Text>
				<Title order={1} size="h2">
					{name}
				</Title>
				<Text c="dimmed">{m.region_meta_description({ name })}</Text>
				<Group gap="xs" mt={4}>
					<Button
						variant="light"
						leftSection={<MapTrifold size={16} />}
						renderRoot={(props) => (
							<Link
								{...props}
								to="/"
								search={{ bbox: [...bbox], uf: [...REGIONS[region]] }}
							/>
						)}
					>
						{m.geopark_view_map()}
					</Button>
				</Group>
			</Stack>

			<SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
				<Tile value={tally.total} label={m.stats_tile_geosites()} />
				<Tile value={states.length} label={m.stats_tile_states()} />
				<Tile value={geoparks.length} label={m.state_tile_geoparks()} />
				<Tile value={genera.length} label={m.stats_tile_genera()} />
			</SimpleGrid>

			<Section title={m.region_states()}>
				<Table.ScrollContainer minWidth={420}>
					<Table
						striped
						withTableBorder
						style={{ fontVariantNumeric: "tabular-nums" }}
					>
						<Table.Thead>
							<Table.Tr>
								<Table.Th scope="col">{m.region_col_state()}</Table.Th>
								<Table.Th scope="col" ta="right">
									{m.region_col_geosites()}
								</Table.Th>
								<Table.Th scope="col" ta="right">
									{m.region_col_international()}
								</Table.Th>
								<Table.Th scope="col" ta="right">
									{m.region_col_geoparks()}
								</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{states.map((s) => (
								<Table.Tr key={s.uf}>
									<Table.Th scope="row" fw={500}>
										<Anchor
											size="sm"
											renderRoot={(props) => (
												<Link
													{...props}
													to="/states/$uf"
													params={{ uf: s.uf.toLowerCase() }}
												/>
											)}
										>
											{stateName(s.uf)}
										</Anchor>
									</Table.Th>
									<Table.Td ta="right">{s.total}</Table.Td>
									<Table.Td ta="right">{s.international}</Table.Td>
									<Table.Td ta="right">{s.geoparks}</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Table.ScrollContainer>
			</Section>

			<Section title={m.stats_by_category()} note={m.stats_category_note()}>
				<BarList
					label={m.stats_by_category()}
					bars={tally.categories.map(({ key, count }) => ({
						key,
						count,
						label: (
							<MapLink
								bbox={bbox}
								search={{ uf: [...REGIONS[region]], cat: [key] }}
							>
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
									<MapLink
										bbox={bbox}
										search={{ uf: [...REGIONS[region]], age: [key, key] }}
									>
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

			{genera.length > 0 && (
				<Section title={m.state_genera()}>
					<GenusLinkList genera={genera} />
				</Section>
			)}

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
