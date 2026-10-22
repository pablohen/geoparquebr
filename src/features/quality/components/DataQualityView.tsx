import {
	Anchor,
	Group,
	List,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { StateLink } from "~/features/states/components/StateLink";
import type { Uf } from "~/features/states/states";
import { Section } from "~/features/stats/components/Section";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import { type DataQuality, ISSUE_KINDS, type IssueKind } from "../schemas";

const LABEL: Record<IssueKind, () => string> = {
	placeholder: m.quality_placeholder,
	"outside-state": m.quality_outside_state,
	"photo-dead": m.quality_photo_dead,
	"photo-missing": m.quality_photo_missing,
	"no-scores": m.quality_no_scores,
	"no-summary": m.quality_no_summary,
	"no-theme": m.quality_no_theme,
};
const HINT: Record<IssueKind, () => string> = {
	placeholder: m.quality_placeholder_hint,
	"outside-state": m.quality_outside_state_hint,
	"photo-dead": m.quality_photo_dead_hint,
	"photo-missing": m.quality_photo_missing_hint,
	"no-scores": m.quality_no_scores_hint,
	"no-summary": m.quality_no_summary_hint,
	"no-theme": m.quality_no_theme_hint,
};

/** What GEOSSIT gets wrong or leaves out, geosite by geosite. */
export function DataQualityView({ data }: { data: DataQuality }) {
	const checked = new Intl.DateTimeFormat(getLocale(), {
		dateStyle: "long",
		timeZone: "America/Sao_Paulo",
	}).format(new Date(data.checkedAt));
	const found = ISSUE_KINDS.filter((k) => data.counts[k] > 0);

	return (
		<Stack gap="xl">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.quality_title()}
				</Title>
				<Text c="dimmed">{m.quality_intro()}</Text>
				<Text size="xs" c="dimmed">
					{m.quality_checked({ date: checked, total: data.total })}
					{data.photosUnchecked > 0 &&
						` ${m.quality_photos_unchecked({ count: data.photosUnchecked })}`}
				</Text>
			</Stack>

			<SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
				{ISSUE_KINDS.map((k) => (
					<Group key={k} gap={8} wrap="nowrap" align="baseline">
						<Text fw={700} w={36} ta="right" ff="monospace">
							{data.counts[k]}
						</Text>
						{data.counts[k] > 0 ? (
							<Anchor href={`#${k}`} size="sm">
								{LABEL[k]()}
							</Anchor>
						) : (
							<Text size="sm" c="dimmed">
								{LABEL[k]()}
							</Text>
						)}
					</Group>
				))}
			</SimpleGrid>

			{found.map((k) => (
				<Stack key={k} id={k} gap="xs" style={{ scrollMarginTop: 16 }}>
					<Section title={LABEL[k]()} note={HINT[k]()}>
						<List size="sm" spacing={4}>
							{data.rows
								.filter((r) => r.issues.includes(k))
								.map((r) => (
									<List.Item key={r.slug}>
										<Anchor
											size="sm"
											renderRoot={(props) => (
												<Link
													{...props}
													to="/geosites/$slug"
													params={{ slug: r.slug }}
												/>
											)}
										>
											{r.name}
										</Anchor>{" "}
										<Text span size="xs" c="dimmed">
											{r.municipality} –{" "}
											<StateLink uf={r.state as Uf} size="xs" />
										</Text>
										{r.sourceUrl && (
											<>
												{" · "}
												<Anchor
													href={r.sourceUrl}
													target="_blank"
													rel="noreferrer"
													size="xs"
												>
													{m.quality_open_geossit()}{" "}
													<ArrowSquareOut size={12} aria-hidden />
												</Anchor>
											</>
										)}
									</List.Item>
								))}
						</List>
					</Section>
				</Stack>
			))}

			<Text size="xs" c="dimmed">
				{m.quality_how_to_fix()}
			</Text>
		</Stack>
	);
}
