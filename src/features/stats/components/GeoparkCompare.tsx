import {
	Anchor,
	Box,
	Group,
	Stack,
	Table,
	Text,
	Title,
	VisuallyHidden,
} from "@mantine/core";
import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { periodLabel } from "~/features/geology/labels";
import { GEOLOGIC_PERIODS } from "~/features/geology/time-scale";
import { GEOPARKS } from "~/features/geoparks/geoparks";
import {
	categoryLabel,
	geoparkIdLabel,
	relevanceLabel,
} from "~/features/geosites/labels";
import { m } from "~/paraglide/messages.js";
import type { GeositeStats } from "../schemas";
import { Section } from "./Section";

type GeoparkTally = GeositeStats["geoparks"][number];

const COLOR = Object.fromEntries(GEOLOGIC_PERIODS.map((p) => [p.id, p.color]));

/** Brazil's geoparks side by side: counts, relevance, themes and rock ages. */
export function GeoparkCompare({ stats }: { stats: GeositeStats }) {
	const parks = stats.geoparks;
	const relevance = (g: GeoparkTally, key: string) =>
		g.relevance.find((r) => r.key === key)?.count ?? 0;

	const rows: { label: string; value: (g: GeoparkTally) => number }[] = [
		{ label: m.compare_row_geosites(), value: (g) => g.total },
		...(["international", "national", "geodiversity"] as const).map((key) => ({
			label: relevanceLabel(key),
			value: (g: GeoparkTally) => relevance(g, key),
		})),
		{ label: m.compare_row_categories(), value: (g) => g.categories.length },
		{ label: m.compare_row_dated(), value: (g) => g.dated },
		{ label: m.compare_row_genera(), value: (g) => g.genera },
	];
	const periodsUsed = GEOLOGIC_PERIODS.filter((p) =>
		parks.some((g) => g.periods.some((c) => c.key === p.id && c.count > 0)),
	);

	return (
		<Stack gap="xl">
			<Anchor
				renderRoot={(props) => <Link {...props} to="/geoparks/" />}
				size="sm"
			>
				<Group gap={4}>
					<ArrowLeft size={14} aria-hidden />
					{m.geopark_all_geoparks()}
				</Group>
			</Anchor>

			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.compare_title()}
				</Title>
				<Text c="dimmed">{m.compare_intro()}</Text>
			</Stack>

			<Section title={m.compare_numbers()}>
				<Table.ScrollContainer minWidth={900}>
					<Table
						striped
						withTableBorder
						verticalSpacing="xs"
						style={{ fontVariantNumeric: "tabular-nums" }}
					>
						<Table.Thead>
							<Table.Tr>
								<Table.Th scope="col">
									<VisuallyHidden>{m.compare_metric()}</VisuallyHidden>
								</Table.Th>
								{parks.map((g) => (
									<Table.Th key={g.id} scope="col" ta="right">
										<Anchor
											size="sm"
											fw={600}
											renderRoot={(props) => (
												<Link
													{...props}
													to="/geoparks/$geoparkId"
													params={{ geoparkId: g.id }}
												/>
											)}
										>
											{geoparkIdLabel(g.id)}
										</Anchor>
									</Table.Th>
								))}
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							<Table.Tr>
								<Table.Th scope="row" fw={500}>
									{m.compare_row_designated()}
								</Table.Th>
								{parks.map((g) => (
									<Table.Td key={g.id} ta="right">
										{GEOPARKS[g.id].designated}
									</Table.Td>
								))}
							</Table.Tr>
							{rows.map((row) => {
								const best = Math.max(...parks.map(row.value));
								return (
									<Table.Tr key={row.label}>
										<Table.Th scope="row" fw={500}>
											{row.label}
										</Table.Th>
										{parks.map((g) => {
											const v = row.value(g);
											return (
												<Table.Td
													key={g.id}
													ta="right"
													fw={v === best && best > 0 ? 700 : undefined}
												>
													{v}
												</Table.Td>
											);
										})}
									</Table.Tr>
								);
							})}
						</Table.Tbody>
					</Table>
				</Table.ScrollContainer>
				<Text size="xs" c="dimmed">
					{m.compare_bold_note()}
				</Text>
			</Section>

			<Section title={m.compare_ages()} note={m.compare_ages_note()}>
				<Stack gap="sm">
					{parks.map((g) => (
						<PeriodStrip key={g.id} park={g} />
					))}
				</Stack>
				<Group
					gap="sm"
					component="ul"
					m={0}
					p={0}
					aria-label={m.compare_legend()}
				>
					{periodsUsed.map((p) => (
						<Group
							key={p.id}
							gap={6}
							component="li"
							wrap="nowrap"
							style={{ listStyle: "none" }}
						>
							<Swatch color={p.color} />
							<Text size="xs">{periodLabel(p.id)}</Text>
						</Group>
					))}
				</Group>
			</Section>

			<Section title={m.compare_themes()}>
				<Stack gap="sm">
					{parks.map((g) => (
						<Box key={g.id}>
							<Text size="sm" fw={600}>
								{geoparkIdLabel(g.id)}
							</Text>
							<Text size="sm" c={g.categories.length ? undefined : "dimmed"}>
								{g.categories.length
									? g.categories
											.slice(0, 4)
											.map((c) => `${categoryLabel(c.key)} (${c.count})`)
											.join(" · ")
									: m.compare_none()}
							</Text>
						</Box>
					))}
				</Stack>
			</Section>
		</Stack>
	);
}

/** One geopark's dated geosites as a strip of period-coloured segments. */
function PeriodStrip({ park }: { park: GeoparkTally }) {
	const parts = park.periods.filter((p) => p.count > 0);
	const sum = parts.reduce((n, p) => n + p.count, 0);
	const summary = parts
		.map((p) => `${periodLabel(p.key)}: ${p.count}`)
		.join(", ");
	return (
		<Stack gap={4}>
			<Text size="sm" fw={600}>
				{geoparkIdLabel(park.id)}
			</Text>
			{sum === 0 ? (
				<Text size="sm" c="dimmed">
					{m.compare_none()}
				</Text>
			) : (
				<Group
					gap={2}
					wrap="nowrap"
					h={14}
					role="img"
					aria-label={summary}
					title={summary}
				>
					{/* Oldest on the left, like the age filter's timeline. */}
					{[...parts].reverse().map((p) => (
						<Box
							key={p.key}
							h="100%"
							style={{
								flex: p.count,
								minWidth: 4,
								borderRadius: 4,
								background: COLOR[p.key],
								boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.12)",
							}}
						/>
					))}
				</Group>
			)}
		</Stack>
	);
}

function Swatch({ color }: { color: string }) {
	return (
		<Box
			aria-hidden
			w={12}
			h={12}
			style={{
				flex: "none",
				borderRadius: 3,
				background: color,
				boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.12)",
			}}
		/>
	);
}
