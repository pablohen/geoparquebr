import {
	Anchor,
	Badge,
	Button,
	Group,
	List,
	NavLink,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { ArrowLeft, ArrowSquareOut, CaretRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { FOSSIL_SEARCH_RADIUS_KM } from "~/features/geology/schemas";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { m } from "~/paraglide/messages.js";
import type { FossilGenus } from "../schemas";
import { gbifGenusUrl } from "../seo";

type Props = { genus: FossilGenus };

/** One fossil genus: its classification, species and the geosites near its records. */
export function FossilGenusView({ genus }: Props) {
	const { kingdom, phylum, class: cls, order, family } = genus.classification;
	const lineage = [kingdom, phylum, cls, order, family].filter(Boolean);
	const records = genus.geosites.reduce((n, g) => n + g.records, 0);

	return (
		<Stack gap="lg">
			<Anchor
				renderRoot={(props) => <Link {...props} to="/fossils/" />}
				size="sm"
			>
				<Group gap={4}>
					<ArrowLeft size={14} />
					{m.fossils_all_genera()}
				</Group>
			</Anchor>

			<Stack gap={6}>
				<Title order={1} size="h2" fs="italic">
					{genus.name}
				</Title>
				<Text c="dimmed" size="sm">
					{m.fossils_genus_label()} ·{" "}
					{m.fossils_geosites_count({ count: genus.geosites.length })} ·{" "}
					{m.fossils_records_count({ count: records })}
				</Text>
			</Stack>

			{lineage.length > 0 && (
				<Stack gap="xs">
					<Title order={2} size="h4">
						{m.fossils_classification()}
					</Title>
					<Text size="sm">{lineage.join(" › ")}</Text>
				</Stack>
			)}

			<Stack gap="xs">
				<Title order={2} size="h4">
					{m.fossils_species_title()}
				</Title>
				{genus.species.length === 0 ? (
					<Text size="sm" c="dimmed">
						{m.fossils_species_none()}
					</Text>
				) : (
					<Group gap="xs">
						{genus.species.map((s) => (
							<Badge key={s} variant="default" tt="none" fs="italic" fw={500}>
								{s}
							</Badge>
						))}
					</Group>
				)}
			</Stack>

			<Stack gap="xs">
				<Title order={2} size="h4">
					{m.fossils_geosites_title()}
				</Title>
				<Stack gap={2} mx="-sm">
					{genus.geosites.map((g) => (
						<NavLink
							key={g.slug}
							renderRoot={(props) => (
								<Link
									{...props}
									to="/geosites/$slug"
									params={{ slug: g.slug }}
								/>
							)}
							label={
								<Text fw={600} size="sm">
									{g.name}
								</Text>
							}
							description={
								<Group gap={6} mt={2}>
									<Text size="xs" c="dimmed">
										{g.municipality} – {g.state}
									</Text>
									{g.geoparkId && (
										<Badge size="xs" variant="light">
											{geoparkIdLabel(g.geoparkId)}
										</Badge>
									)}
								</Group>
							}
							rightSection={
								<Group gap={4} wrap="nowrap">
									<Text size="xs" c="dimmed">
										{m.fossils_records_count({ count: g.records })}
									</Text>
									<CaretRight size={14} />
								</Group>
							}
							styles={{ root: { borderRadius: "var(--mantine-radius-md)" } }}
						/>
					))}
				</Stack>
				<Text size="xs" c="dimmed">
					{m.fossils_geosites_note({ radiusKm: FOSSIL_SEARCH_RADIUS_KM })}
				</Text>
			</Stack>

			{genus.units.length > 0 && (
				<RecordedList title={m.fossils_units_title()} items={genus.units} />
			)}
			{genus.ages.length > 0 && (
				<RecordedList title={m.fossils_ages_title()} items={genus.ages} />
			)}

			<Button
				component="a"
				href={gbifGenusUrl(genus.gbifKey)}
				target="_blank"
				rel="noopener"
				variant="light"
				rightSection={<ArrowSquareOut size={16} />}
				style={{ alignSelf: "flex-start" }}
			>
				{m.fossils_view_gbif()}
			</Button>

			<Text size="xs" c="dimmed">
				{m.fossils_source_note()}
			</Text>
		</Stack>
	);
}

function RecordedList({ title, items }: { title: string; items: string[] }) {
	return (
		<Stack gap="xs">
			<Title order={2} size="h4">
				{title}
			</Title>
			<List size="sm" spacing={4}>
				{items.map((item) => (
					<List.Item key={item}>{item}</List.Item>
				))}
			</List>
		</Stack>
	);
}
