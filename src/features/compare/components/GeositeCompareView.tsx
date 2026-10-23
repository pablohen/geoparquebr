import {
	Anchor,
	Badge,
	Group,
	SimpleGrid,
	Stack,
	Table,
	Text,
	Title,
	VisuallyHidden,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { GenusLinkList } from "~/features/fossils/components/GenusLinks";
import type { GenusLink } from "~/features/fossils/schemas";
import { CATEGORY_COLORS } from "~/features/geosites/components/categoryStyle";
import { formatGeologicAge } from "~/features/geosites/geologic-age";
import {
	categoryLabel,
	degradationRiskLabel,
	geoparkLabel,
	relevanceLabel,
	SCORE_KEYS,
	scoreLabel,
} from "~/features/geosites/labels";
import type { Geosite } from "~/features/geosites/schemas";
import { unitNames, unitSlug } from "~/features/units/units";
import { m } from "~/paraglide/messages.js";
import { type CompareSearch, scoreLeader } from "../compare";
import { GeositePicker } from "./GeositePicker";

export type Side = { geosite: Geosite; genera: GenusLink[] } | null;

type Props = {
	search: CompareSearch;
	a: Side;
	b: Side;
	onSearchChange: (next: CompareSearch) => void;
};

/** Two geosites side by side, each picked with a search box. */
export function GeositeCompareView({ search, a, b, onSearchChange }: Props) {
	const pick = (side: Side) =>
		side ? { slug: side.geosite.slug, name: side.geosite.name } : undefined;

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.cmp_title()}
				</Title>
				<Text c="dimmed">{m.cmp_intro()}</Text>
			</Stack>

			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
				<GeositePicker
					label={m.cmp_pick_a()}
					value={pick(a)}
					onChange={(slug) => onSearchChange({ ...search, a: slug })}
				/>
				<GeositePicker
					label={m.cmp_pick_b()}
					value={pick(b)}
					onChange={(slug) => onSearchChange({ ...search, b: slug })}
				/>
			</SimpleGrid>
			{(search.a && !a) || (search.b && !b) ? (
				<Text size="sm" c="red">
					{m.cmp_not_found()}
				</Text>
			) : null}

			{a && b ? (
				<CompareTable a={a} b={b} />
			) : (
				<Text c="dimmed">{m.cmp_pick_both()}</Text>
			)}
		</Stack>
	);
}

function CompareTable({
	a,
	b,
}: {
	a: NonNullable<Side>;
	b: NonNullable<Side>;
}) {
	const ga = a.geosite;
	const gb = b.geosite;
	const age = (g: Geosite) =>
		g.geologicAge ? (
			<Stack gap={2}>
				<Text size="sm">{formatGeologicAge(g.geologicAge)}</Text>
				<Group gap={6}>
					{unitNames(g.geologicAge.formation).map((name) => (
						<Anchor
							key={name}
							size="xs"
							renderRoot={(props) => (
								<Link
									{...props}
									to="/units/$slug"
									params={{ slug: unitSlug(name) }}
								/>
							)}
						>
							{name}
						</Anchor>
					))}
				</Group>
			</Stack>
		) : (
			"—"
		);

	const rows: { label: string; render: (s: NonNullable<Side>) => ReactNode }[] =
		[
			{
				label: m.cmp_row_place(),
				render: (s) => (
					<Stack gap={0}>
						<Text size="sm">
							{s.geosite.municipality} – {s.geosite.state}
						</Text>
						<Text size="xs" c="dimmed">
							{geoparkLabel(s.geosite)}
						</Text>
					</Stack>
				),
			},
			{
				label: m.detail_relevance(),
				render: (s) => relevanceLabel(s.geosite.relevance),
			},
			{
				label: m.cmp_row_themes(),
				render: (s) => (
					<Group gap={4}>
						{s.geosite.categories.map((c) => (
							<Badge
								key={c}
								size="xs"
								variant="light"
								color={CATEGORY_COLORS[c]}
							>
								{categoryLabel(c)}
							</Badge>
						))}
					</Group>
				),
			},
			...SCORE_KEYS.map((key) => {
				const leader = scoreLeader(key, ga.scores?.[key], gb.scores?.[key]);
				return {
					label: scoreLabel(key),
					render: (s: NonNullable<Side>) => {
						const value = s.geosite.scores?.[key];
						const isLeader =
							leader !== null && (leader === "a" ? s === a : s === b);
						return (
							<Text size="sm" fw={isLeader ? 700 : undefined}>
								{value === undefined
									? "—"
									: m.rankings_score_of({ score: value })}
							</Text>
						);
					},
				};
			}),
			{
				label: m.detail_degradation_risk(),
				render: (s) =>
					s.geosite.degradationRisk
						? degradationRiskLabel(s.geosite.degradationRisk)
						: "—",
			},
			{
				label:
					ga.geologicAge?.mapScale || gb.geologicAge?.mapScale
						? m.detail_mapped_rock()
						: m.detail_geological_age(),
				render: (s) => age(s.geosite),
			},
			{
				label: m.cmp_row_genera(),
				render: (s) =>
					s.genera.length > 0 ? <GenusLinkList genera={s.genera} /> : "—",
			},
		];

	const nameLink = (g: Geosite) => (
		<Anchor
			fw={600}
			size="sm"
			renderRoot={(props) => (
				<Link {...props} to="/geosites/$slug" params={{ slug: g.slug }} />
			)}
		>
			{g.name}
		</Anchor>
	);

	return (
		<Stack gap="xs">
			{/* Tablets and up: a table, one column per geosite. */}
			<Table
				withTableBorder
				layout="fixed"
				verticalSpacing="xs"
				visibleFrom="sm"
			>
				<Table.Thead>
					<Table.Tr>
						<Table.Th scope="col" w="24%">
							<VisuallyHidden>{m.compare_metric()}</VisuallyHidden>
						</Table.Th>
						{[ga, gb].map((g) => (
							<Table.Th key={g.slug} scope="col">
								{nameLink(g)}
							</Table.Th>
						))}
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{rows.map(({ label, render }) => (
						<Table.Tr key={label}>
							<Table.Th scope="row" fw={500}>
								{label}
							</Table.Th>
							<Table.Td>{render(a)}</Table.Td>
							<Table.Td>{render(b)}</Table.Td>
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>

			{/* Phones: each metric with both values under it, so nothing scrolls sideways. */}
			<Stack gap="sm" hiddenFrom="sm">
				<SimpleGrid cols={2} spacing="xs">
					{[ga, gb].map((g, i) => (
						<Group key={g.slug} gap={6} wrap="nowrap" align="flex-start">
							<Badge size="sm" variant="filled" circle>
								{i === 0 ? "A" : "B"}
							</Badge>
							{nameLink(g)}
						</Group>
					))}
				</SimpleGrid>
				{rows.map(({ label, render }) => (
					<Stack
						key={label}
						gap={4}
						pt="xs"
						style={{
							borderTop: "1px solid var(--mantine-color-default-border)",
						}}
					>
						<Text size="xs" fw={600} c="dimmed" tt="uppercase">
							{label}
						</Text>
						<SimpleGrid cols={2} spacing="xs">
							{[a, b].map((side, i) => (
								<Group
									key={side.geosite.slug}
									gap={6}
									wrap="nowrap"
									align="flex-start"
								>
									<Badge
										size="xs"
										variant="light"
										circle
										aria-hidden
										style={{ flex: "none" }}
									>
										{i === 0 ? "A" : "B"}
									</Badge>
									{/* The table's cells are size sm; match them. */}
									<Text component="div" size="sm" miw={0}>
										<VisuallyHidden>{side.geosite.name}: </VisuallyHidden>
										{render(side)}
									</Text>
								</Group>
							))}
						</SimpleGrid>
					</Stack>
				))}
			</Stack>
			<Text size="xs" c="dimmed">
				{m.cmp_bold_note()}
			</Text>
		</Stack>
	);
}
