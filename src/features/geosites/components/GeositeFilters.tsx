import {
	Anchor,
	Button,
	Group,
	MultiSelect,
	Select,
	Stack,
} from "@mantine/core";
import { FunnelSimpleX } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";
import { categoryLabel, geoparkIdLabel, relevanceLabel } from "../labels";
import {
	type AgeRange,
	type FilterScoreKey,
	GEOPARK_IDS,
	GEOSITE_CATEGORIES,
	type GeoparkId,
	GeoparkIdSchema,
	type GeositeCategory,
	GeositeCategorySchema,
	type Relevance,
	RelevanceSchema,
} from "../schemas";
import { AgeFilter } from "./AgeFilter";
import { MinScoreFilter } from "./MinScoreFilter";

export type FilterValues = {
	cat?: GeositeCategory[];
	rel?: Relevance;
	gp?: GeoparkId;
	age?: AgeRange;
	sk?: FilterScoreKey;
	sm?: number;
};

type Props = {
	value: FilterValues;
	onChange: (next: FilterValues) => void;
};

/** Filters live in the URL (`cat`, `rel`, `gp`, `age`); empty values are omitted. */
export function GeositeFilters({ value, onChange }: Props) {
	// Built per render: labels follow the request's locale.
	const categoryOptions = GEOSITE_CATEGORIES.map((c) => ({
		value: c,
		label: categoryLabel(c),
	}));
	const relevanceOptions = RelevanceSchema.options.map((r) => ({
		value: r,
		label: relevanceLabel(r),
	}));
	const geoparkOptions = GEOPARK_IDS.map((g) => ({
		value: g,
		label: geoparkIdLabel(g),
	}));
	const active = Boolean(
		value.cat?.length || value.rel || value.gp || value.age || value.sk,
	);

	return (
		<Stack gap="xs">
			<MultiSelect
				size="xs"
				label={m.filters_themes()}
				placeholder={value.cat?.length ? undefined : m.filters_all_masculine()}
				data={categoryOptions}
				value={value.cat ?? []}
				onChange={(next) => {
					const cat = next
						.map((c) => GeositeCategorySchema.safeParse(c))
						.flatMap((r) => (r.success ? [r.data] : []));
					onChange({ ...value, cat: cat.length > 0 ? cat : undefined });
				}}
				clearable
				searchable
				nothingFoundMessage={m.filters_no_theme()}
			/>
			<Group grow gap="xs" align="flex-end">
				<Select
					size="xs"
					label={m.filters_relevance()}
					placeholder={m.filters_all_feminine()}
					data={relevanceOptions}
					value={value.rel ?? null}
					onChange={(next) => {
						const rel = RelevanceSchema.safeParse(next);
						onChange({ ...value, rel: rel.success ? rel.data : undefined });
					}}
					clearable
				/>
				<Select
					size="xs"
					label={m.filters_geopark()}
					placeholder={m.filters_all_masculine()}
					data={geoparkOptions}
					value={value.gp ?? null}
					onChange={(next) => {
						const gp = GeoparkIdSchema.safeParse(next);
						onChange({ ...value, gp: gp.success ? gp.data : undefined });
					}}
					clearable
				/>
			</Group>
			<Group gap="md" justify="flex-end" style={{ rowGap: 4 }}>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/geoparks/" />}
				>
					{m.geoparks_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/fossils/" />}
				>
					{m.fossils_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/news" />}
				>
					{m.news_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/timeline" />}
				>
					{m.timeline_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/stats" />}
				>
					{m.stats_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/rankings" />}
				>
					{m.rankings_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/states" />}
				>
					{m.states_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/units" />}
				>
					{m.units_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/conservation" />}
				>
					{m.conservation_link()}
				</Anchor>
				<Anchor
					size="xs"
					renderRoot={(props) => <Link {...props} to="/glossary" />}
				>
					{m.glossary_link()}
				</Anchor>
			</Group>
			<AgeFilter
				value={value.age}
				onChange={(age) => onChange({ ...value, age })}
			/>
			<MinScoreFilter
				value={{ sk: value.sk, sm: value.sm }}
				onChange={(score) => onChange({ ...value, ...score })}
			/>
			{active && (
				<Button
					size="compact-xs"
					variant="subtle"
					leftSection={<FunnelSimpleX size={14} />}
					onClick={() =>
						onChange({
							cat: undefined,
							rel: undefined,
							gp: undefined,
							age: undefined,
							sk: undefined,
							sm: undefined,
						})
					}
					style={{ alignSelf: "flex-start" }}
				>
					{m.filters_clear()}
				</Button>
			)}
		</Stack>
	);
}
