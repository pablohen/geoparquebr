import {
	Anchor,
	Box,
	Chip,
	Group,
	Progress,
	Select,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { GEOPARKS } from "~/features/geoparks/geoparks";
import {
	geoparkIdLabel,
	SCORE_KEYS,
	scoreLabel,
} from "~/features/geosites/labels";
import { type GeoparkId, GeoparkIdSchema } from "~/features/geosites/schemas";
import { scoreAnchor } from "~/features/glossary/glossary";
import { m } from "~/paraglide/messages.js";
import { type Rankings, type RankingsSearch, ScoreKeySchema } from "../schemas";

type Props = {
	rankings: Rankings;
	search: RankingsSearch;
	onSearchChange: (next: RankingsSearch) => void;
};

/** The top geosites by one GEOSSIT score, with geopark and state filters. */
export function RankingsView({ rankings, search, onSearchChange }: Props) {
	const by = search.by ?? "scientific";
	const { items, total, states } = rankings;

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.rankings_title()}
				</Title>
				<Text c="dimmed">{m.rankings_intro()}</Text>
			</Stack>

			<Stack gap="sm">
				<Box component="fieldset" m={0} p={0} style={{ border: 0 }}>
					<Text component="legend" size="sm" fw={500} mb={6}>
						{m.rankings_metric()}
					</Text>
					<Chip.Group
						value={by}
						onChange={(value) => {
							const next = ScoreKeySchema.safeParse(value);
							onSearchChange({
								...search,
								by:
									next.success && next.data !== "scientific"
										? next.data
										: undefined,
							});
						}}
					>
						<Group gap="xs">
							{SCORE_KEYS.map((key) => (
								<Chip key={key} value={key} size="sm">
									{scoreLabel(key)}
								</Chip>
							))}
						</Group>
					</Chip.Group>
				</Box>
				<Group gap="xs" grow preventGrowOverflow={false}>
					<Select
						label={m.filters_geopark()}
						placeholder={m.filters_all_masculine()}
						data={(Object.keys(GEOPARKS) as GeoparkId[]).map((id) => ({
							value: id,
							label: geoparkIdLabel(id),
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
					<Select
						label={m.rankings_state()}
						placeholder={m.filters_all_masculine()}
						data={states}
						value={search.uf ?? null}
						onChange={(uf) =>
							onSearchChange({ ...search, uf: uf ?? undefined })
						}
						clearable
						searchable
						miw={120}
					/>
				</Group>
				<Group gap="md" justify="space-between">
					<Text size="sm" c="dimmed">
						{total > 0
							? m.rankings_count({ shown: items.length, total })
							: m.rankings_empty()}
					</Text>
					<Anchor
						size="sm"
						renderRoot={(props) => (
							<Link {...props} to="/glossary" hash={scoreAnchor(by)} />
						)}
					>
						{m.rankings_what()}
					</Anchor>
				</Group>
				{by === "vulnerability" && (
					<Text size="sm">{m.rankings_vulnerability_note()}</Text>
				)}
			</Stack>

			<Stack component="ol" gap="xs" m={0} p={0}>
				{items.map((g) => (
					<Box
						component="li"
						key={g.slug}
						py={6}
						style={{
							listStyle: "none",
							borderBottom: "1px solid var(--mantine-color-default-border)",
						}}
					>
						<Group gap="sm" wrap="nowrap" align="flex-start">
							<Text
								fw={700}
								w={44}
								ta="right"
								style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}
							>
								{m.rankings_rank({ rank: g.rank })}
							</Text>
							<Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
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
								<Text size="xs" c="dimmed">
									{g.municipality} – {g.state}
									{g.geoparkId && <> · {geoparkIdLabel(g.geoparkId)}</>}
								</Text>
							</Stack>
							<Stack gap={4} w={{ base: 88, sm: 140 }} style={{ flex: "none" }}>
								<Text
									size="sm"
									ta="right"
									style={{ fontVariantNumeric: "tabular-nums" }}
								>
									{m.rankings_score_of({ score: g.scores[by] })}
								</Text>
								<Progress
									value={(g.scores[by] / 400) * 100}
									color={by === "vulnerability" ? "red" : undefined}
									size="sm"
									aria-hidden
								/>
							</Stack>
						</Group>
					</Box>
				))}
			</Stack>

			<Text size="xs" c="dimmed">
				{m.rankings_source_note()}
			</Text>
		</Stack>
	);
}
