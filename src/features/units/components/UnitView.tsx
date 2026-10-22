import { Anchor, Box, Group, Stack, Text, Title } from "@mantine/core";
import { ArrowLeft } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { GenusLinkList } from "~/features/fossils/components/GenusLinks";
import { formatAgeRange } from "~/features/geology/time-scale";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { Section } from "~/features/stats/components/Section";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import type { UnitPage } from "../schemas";

/** One rock unit: its mapped age, the geosites on it and nearby fossils. */
export function UnitView({ unit }: { unit: UnitPage }) {
	const { name, age, geosites, genera } = unit;
	const range = age && formatAgeRange(age.minMa, age.maxMa);

	return (
		<Stack gap="xl">
			<Anchor renderRoot={(props) => <Link {...props} to="/units" />} size="sm">
				<Group gap={4}>
					<ArrowLeft size={14} aria-hidden />
					{m.unit_all_units()}
				</Group>
			</Anchor>

			<Stack gap={6}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={600}>
					{m.unit_eyebrow()}
				</Text>
				<Title order={1} size="h2">
					{name}
				</Title>
				<Text c="dimmed">
					{m.unit_meta_description({ name, count: geosites.length })}
				</Text>
				<Anchor
					size="sm"
					style={{ alignSelf: "flex-start" }}
					renderRoot={(props) => (
						<Link {...props} to="/glossary" hash="formation" />
					)}
				>
					{m.unit_what()}
				</Anchor>
			</Stack>

			<Section title={m.unit_age()}>
				{age ? (
					<Stack gap={2}>
						<Text>
							{[age.period, range !== age.period ? range : undefined]
								.filter(Boolean)
								.join(" · ")}
						</Text>
						{age.mapScale && (
							<Text size="xs" c="dimmed">
								{m.unit_age_note({
									scale: age.mapScale.toLocaleString(getLocale()),
								})}
							</Text>
						)}
					</Stack>
				) : (
					<Text size="sm" c="dimmed">
						{m.unit_age_none()}
					</Text>
				)}
			</Section>

			<Section title={m.unit_geosites()} note={m.unit_map_note()}>
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
								{g.municipality} – {g.state}
								{g.geoparkId && <> · {geoparkIdLabel(g.geoparkId)}</>}
								{g.alongside.length > 0 && (
									<> · {m.unit_alongside({ names: g.alongside.join(", ") })}</>
								)}
							</Text>
						</Box>
					))}
				</Stack>
			</Section>

			{genera.length > 0 && (
				<Section title={m.state_genera()}>
					<GenusLinkList genera={genera} />
				</Section>
			)}
		</Stack>
	);
}
