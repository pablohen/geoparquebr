import {
	Anchor,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";
import type { UnitSummary } from "../schemas";
import { unitSlug } from "../units";

type Props = {
	units: UnitSummary[];
	q: string | undefined;
	onQueryChange: (q: string | undefined) => void;
};

/** Every mapped unit with geosites, most first, with a name filter. */
export function UnitsIndex({ units, q, onQueryChange }: Props) {
	// Matched accent-free, like the slugs: "sao desiderio" finds "São Desidério".
	const needle = q ? unitSlug(q) : "";
	const shown = needle ? units.filter((u) => u.slug.includes(needle)) : units;

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.units_title()}
				</Title>
				<Text c="dimmed">{m.units_intro()}</Text>
			</Stack>
			<TextInput
				label={m.units_search()}
				leftSection={<MagnifyingGlass size={14} />}
				value={q ?? ""}
				onChange={(e) => onQueryChange(e.currentTarget.value || undefined)}
				maw={360}
			/>
			<Text size="sm" c="dimmed">
				{m.units_count({ count: shown.length })}
			</Text>
			{shown.length === 0 && <Text c="dimmed">{m.units_none()}</Text>}
			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing={6}>
				{shown.map((u) => (
					<Text key={u.slug} size="sm">
						<Anchor
							size="sm"
							renderRoot={(props) => (
								<Link {...props} to="/units/$slug" params={{ slug: u.slug }} />
							)}
						>
							{u.name}
						</Anchor>{" "}
						<Text span size="xs" c="dimmed">
							{m.timeline_geosites_count({ count: u.geositeCount })}
						</Text>
					</Text>
				))}
			</SimpleGrid>
		</Stack>
	);
}
