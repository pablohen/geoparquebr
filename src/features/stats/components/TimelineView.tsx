import {
	Accordion,
	Anchor,
	Box,
	Group,
	List,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { MapTrifold } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { periodLabel } from "~/features/geology/labels";
import {
	GEOLOGIC_PERIODS,
	type GeologicPeriodId,
	periodSpanMa,
} from "~/features/geology/time-scale";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import type { Timeline } from "../schemas";
import { MapLink } from "./MapLink";

const COLOR = Object.fromEntries(GEOLOGIC_PERIODS.map((p) => [p.id, p.color]));

/** "Linha do tempo": every geological period, youngest on top, with its geosites. */
export function TimelineView({ timeline }: { timeline: Timeline }) {
	const locale = getLocale();
	const ma = (n: number) => n.toLocaleString(locale);
	const span = (id: GeologicPeriodId) => {
		const [top, base] = periodSpanMa(id);
		return m.timeline_span({ from: ma(top), to: ma(base) });
	};
	const most = Math.max(1, ...timeline.periods.map((p) => p.geosites.length));

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.timeline_title()}
				</Title>
				<Text c="dimmed">{m.timeline_intro()}</Text>
				<Text size="sm" c="dimmed">
					{m.timeline_undated({
						undated: timeline.undated,
						total: timeline.total,
					})}
				</Text>
			</Stack>

			<Accordion
				multiple
				variant="separated"
				radius="md"
				chevronPosition="right"
			>
				{timeline.periods.map(({ id, geosites }) => (
					<Accordion.Item key={id} value={id}>
						<Accordion.Control disabled={geosites.length === 0}>
							<Group gap="sm" wrap="nowrap" align="stretch">
								<Box
									aria-hidden
									w={10}
									style={{
										flex: "none",
										borderRadius: 4,
										background: COLOR[id],
										boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.12)",
									}}
								/>
								<Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
									<Group justify="space-between" gap="xs" wrap="nowrap">
										<Text fw={600}>{periodLabel(id)}</Text>
										<Text
											size="sm"
											c={geosites.length ? undefined : "dimmed"}
											style={{ whiteSpace: "nowrap" }}
										>
											{m.timeline_geosites_count({ count: geosites.length })}
										</Text>
									</Group>
									<Text size="xs" c="dimmed">
										{span(id)}
									</Text>
									<Box
										aria-hidden
										h={4}
										mt={4}
										w={`${(geosites.length / most) * 100}%`}
										style={{
											borderRadius: 4,
											background: "var(--mantine-color-dimmed)",
											opacity: 0.4,
										}}
									/>
								</Stack>
							</Group>
						</Accordion.Control>
						<Accordion.Panel>
							<Stack gap="xs">
								<MapLink search={{ age: [id, id] }}>
									<Group gap={4} component="span" display="inline-flex">
										<MapTrifold size={14} aria-hidden />
										{m.timeline_view_map()}
									</Group>
								</MapLink>
								<List size="sm" spacing={4}>
									{geosites.map((g) => (
										<List.Item key={g.slug}>
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
											</Text>
										</List.Item>
									))}
								</List>
							</Stack>
						</Accordion.Panel>
					</Accordion.Item>
				))}
			</Accordion>

			<Text size="xs" c="dimmed">
				{m.timeline_source_note()}
			</Text>
		</Stack>
	);
}
