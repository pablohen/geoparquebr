import {
	Anchor,
	Badge,
	Box,
	Group,
	List,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import {
	degradationRiskLabel,
	geoparkIdLabel,
} from "~/features/geosites/labels";
import { BarList } from "~/features/stats/components/BarList";
import { Section } from "~/features/stats/components/Section";
import { m } from "~/paraglide/messages.js";
import type { Conservation } from "../schemas";

const RISK_COLOR = {
	low: "var(--mantine-color-teal-filled)",
	medium: "var(--mantine-color-yellow-filled)",
	high: "var(--mantine-color-red-filled)",
} as const;

/** High-risk geosites and how to visit them without damage. */
export function ConservationView({ data }: { data: Conservation }) {
	const tips = [
		m.conservation_tip_trails(),
		m.conservation_tip_collect(),
		m.conservation_tip_marks(),
		m.conservation_tip_guide(),
		m.conservation_tip_waste(),
		m.conservation_tip_report(),
	];

	return (
		<Stack gap="xl">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.conservation_title()}
				</Title>
				<Text c="dimmed">{m.conservation_intro()}</Text>
				<Anchor
					size="sm"
					style={{ alignSelf: "flex-start" }}
					renderRoot={(props) => (
						<Link {...props} to="/glossary" hash="degradation-risk" />
					)}
				>
					{m.conservation_what()}
				</Anchor>
			</Stack>

			<Section title={m.conservation_tips()}>
				<List size="sm" spacing={6}>
					{tips.map((tip) => (
						<List.Item key={tip}>{tip}</List.Item>
					))}
				</List>
			</Section>

			<Section title={m.conservation_by_risk()}>
				<BarList
					label={m.conservation_by_risk()}
					max={data.total}
					bars={data.risks.map(({ key, count }) => ({
						key,
						count,
						label: degradationRiskLabel(key),
						color: RISK_COLOR[key],
					}))}
				/>
			</Section>

			<Section title={m.conservation_high()} note={m.conservation_high_note()}>
				<Stack component="ol" gap={6} m={0} p={0}>
					{data.high.map((g) => (
						<Box component="li" key={g.slug} style={{ listStyle: "none" }}>
							<Group gap={6} wrap="wrap">
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
								</Anchor>
								<Text size="xs" c="dimmed">
									{g.municipality} – {g.state}
									{g.geoparkId && <> · {geoparkIdLabel(g.geoparkId)}</>}
								</Text>
								{g.vulnerability !== undefined && (
									<Badge size="xs" variant="light" color="red">
										{m.conservation_vulnerability({ score: g.vulnerability })}
									</Badge>
								)}
								{g.locationIsSensitive && (
									<Badge size="xs" variant="default">
										{m.conservation_protected()}
									</Badge>
								)}
							</Group>
						</Box>
					))}
				</Stack>
			</Section>

			<Text size="xs" c="dimmed">
				{m.conservation_source_note()}
			</Text>
		</Stack>
	);
}
