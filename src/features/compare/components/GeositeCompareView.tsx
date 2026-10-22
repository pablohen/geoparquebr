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
	const row = (label: string, render: (s: NonNullable<Side>) => ReactNode) => (
		<Table.Tr key={label}>
			<Table.Th scope="row" fw={500} w="24%">
				{label}
			</Table.Th>
			<Table.Td>{render(a)}</Table.Td>
			<Table.Td>{render(b)}</Table.Td>
		</Table.Tr>
	);
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

	return (
		<Stack gap="xs">
			<Table.ScrollContainer minWidth={480}>
				<Table withTableBorder layout="fixed" verticalSpacing="xs">
					<Table.Thead>
						<Table.Tr>
							<Table.Th scope="col">
								<VisuallyHidden>{m.compare_metric()}</VisuallyHidden>
							</Table.Th>
							{[ga, gb].map((g) => (
								<Table.Th key={g.slug} scope="col">
									<Anchor
										fw={600}
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
									</Anchor>
								</Table.Th>
							))}
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{row(m.cmp_row_place(), (s) => (
							<Stack gap={0}>
								<Text size="sm">
									{s.geosite.municipality} – {s.geosite.state}
								</Text>
								<Text size="xs" c="dimmed">
									{geoparkLabel(s.geosite)}
								</Text>
							</Stack>
						))}
						{row(m.detail_relevance(), (s) =>
							relevanceLabel(s.geosite.relevance),
						)}
						{row(m.cmp_row_themes(), (s) => (
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
						))}
						{SCORE_KEYS.map((key) => {
							const leader = scoreLeader(
								key,
								ga.scores?.[key],
								gb.scores?.[key],
							);
							return row(scoreLabel(key), (s) => {
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
							});
						})}
						{row(m.detail_degradation_risk(), (s) =>
							s.geosite.degradationRisk
								? degradationRiskLabel(s.geosite.degradationRisk)
								: "—",
						)}
						{row(
							ga.geologicAge?.mapScale || gb.geologicAge?.mapScale
								? m.detail_mapped_rock()
								: m.detail_geological_age(),
							(s) => age(s.geosite),
						)}
						{row(m.cmp_row_genera(), (s) =>
							s.genera.length > 0 ? <GenusLinkList genera={s.genera} /> : "—",
						)}
					</Table.Tbody>
				</Table>
			</Table.ScrollContainer>
			<Text size="xs" c="dimmed">
				{m.cmp_bold_note()}
			</Text>
		</Stack>
	);
}
