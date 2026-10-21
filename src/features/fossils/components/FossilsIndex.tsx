import {
	Anchor,
	Button,
	Group,
	Select,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { FOSSIL_SEARCH_RADIUS_KM } from "~/features/geology/schemas";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { GeoparkIdSchema } from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";
import {
	filterGenera,
	geoparkCounts,
	groupCounts,
	groupGenera,
	OTHER_GROUP,
} from "../filter";
import type { FossilGenusSummary, FossilsSearch } from "../schemas";

type Props = {
	genera: FossilGenusSummary[];
	search: FossilsSearch;
	onSearchChange: (next: FossilsSearch) => void;
};

const groupLabel = (group: string) =>
	group === OTHER_GROUP ? m.fossils_group_other() : group;

/** Every indexed genus, grouped by class (as named in the GBIF backbone), with filters. */
export function FossilsIndex({ genera, search, onSearchChange }: Props) {
	const shown = filterGenera(genera, search);
	const filtered = Boolean(search.q || search.group || search.gp);

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.fossils_title()}
				</Title>
				<Text c="dimmed">
					{m.fossils_page_intro({ radiusKm: FOSSIL_SEARCH_RADIUS_KM })}
				</Text>
			</Stack>

			{genera.length === 0 ? (
				<Text c="dimmed">{m.fossils_empty()}</Text>
			) : (
				<Stack gap="xs">
					<Group gap="xs" align="flex-end" grow preventGrowOverflow={false}>
						<TextInput
							label={m.fossils_filter_name()}
							leftSection={<MagnifyingGlass size={14} />}
							value={search.q ?? ""}
							onChange={(e) =>
								onSearchChange({
									...search,
									q: e.currentTarget.value || undefined,
								})
							}
							miw={180}
						/>
						<Select
							label={m.fossils_filter_group()}
							placeholder={m.fossils_filter_all()}
							data={groupCounts(genera).map(({ group, count }) => ({
								value: group,
								label: `${groupLabel(group)} (${count})`,
							}))}
							value={search.group ?? null}
							onChange={(group) =>
								onSearchChange({ ...search, group: group ?? undefined })
							}
							clearable
							searchable
							miw={180}
						/>
						<Select
							label={m.fossils_filter_geopark()}
							placeholder={m.fossils_filter_all()}
							data={geoparkCounts(genera).map(({ id, count }) => ({
								value: id,
								label: `${geoparkIdLabel(id)} (${count})`,
							}))}
							value={search.gp ?? null}
							onChange={(gp) => {
								const id = GeoparkIdSchema.safeParse(gp);
								onSearchChange({
									...search,
									gp: id.success ? id.data : undefined,
								});
							}}
							clearable
							miw={180}
						/>
					</Group>
					<Group justify="space-between" gap="xs">
						<Text size="sm" c="dimmed">
							{filtered
								? m.fossils_filter_shown({
										shown: shown.length,
										total: genera.length,
									})
								: m.fossils_genus_count({ count: genera.length })}
						</Text>
						{filtered && (
							<Button
								size="compact-xs"
								variant="subtle"
								onClick={() => onSearchChange({})}
							>
								{m.fossils_filter_clear()}
							</Button>
						)}
					</Group>
				</Stack>
			)}

			{genera.length > 0 && shown.length === 0 && (
				<Text c="dimmed">{m.fossils_filter_none()}</Text>
			)}

			{groupGenera(shown).map(({ group, genera: list }) => (
				<Stack key={group} gap="xs">
					<Title order={2} size="h4">
						{groupLabel(group)}
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
