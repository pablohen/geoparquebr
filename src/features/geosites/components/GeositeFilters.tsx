import { Button, Group, MultiSelect, Select, Stack } from "@mantine/core";
import { FunnelSimpleX } from "@phosphor-icons/react";
import {
	GEOPARK_IDS,
	GEOPARK_LABELS,
	GEOSITE_CATEGORIES,
	GEOSITE_CATEGORY_LABELS,
	type GeoparkId,
	GeoparkIdSchema,
	type GeositeCategory,
	GeositeCategorySchema,
	RELEVANCE_LABELS,
	type Relevance,
	RelevanceSchema,
} from "../schemas";

export type FilterValues = {
	cat?: GeositeCategory[];
	rel?: Relevance;
	gp?: GeoparkId;
};

type Props = {
	value: FilterValues;
	onChange: (next: FilterValues) => void;
};

const CATEGORY_OPTIONS = GEOSITE_CATEGORIES.map((c) => ({
	value: c,
	label: GEOSITE_CATEGORY_LABELS[c],
}));
const RELEVANCE_OPTIONS = RelevanceSchema.options.map((r) => ({
	value: r,
	label: RELEVANCE_LABELS[r],
}));
const GEOPARK_OPTIONS = GEOPARK_IDS.map((g) => ({
	value: g,
	label: GEOPARK_LABELS[g],
}));

/** Filters live in the URL (`cat`, `rel`, `gp`); empty values are omitted. */
export function GeositeFilters({ value, onChange }: Props) {
	const active = Boolean(value.cat?.length || value.rel || value.gp);

	return (
		<Stack gap="xs">
			<MultiSelect
				size="xs"
				label="Temas"
				placeholder={value.cat?.length ? undefined : "Todos"}
				data={CATEGORY_OPTIONS}
				value={value.cat ?? []}
				onChange={(next) => {
					const cat = next
						.map((c) => GeositeCategorySchema.safeParse(c))
						.flatMap((r) => (r.success ? [r.data] : []));
					onChange({ ...value, cat: cat.length > 0 ? cat : undefined });
				}}
				clearable
				searchable
				nothingFoundMessage="Nenhum tema"
			/>
			<Group grow gap="xs" align="flex-end">
				<Select
					size="xs"
					label="Relevância"
					placeholder="Todas"
					data={RELEVANCE_OPTIONS}
					value={value.rel ?? null}
					onChange={(next) => {
						const rel = RelevanceSchema.safeParse(next);
						onChange({ ...value, rel: rel.success ? rel.data : undefined });
					}}
					clearable
				/>
				<Select
					size="xs"
					label="Geoparque UNESCO"
					placeholder="Todos"
					data={GEOPARK_OPTIONS}
					value={value.gp ?? null}
					onChange={(next) => {
						const gp = GeoparkIdSchema.safeParse(next);
						onChange({ ...value, gp: gp.success ? gp.data : undefined });
					}}
					clearable
				/>
			</Group>
			{active && (
				<Button
					size="compact-xs"
					variant="subtle"
					leftSection={<FunnelSimpleX size={14} />}
					onClick={() =>
						onChange({ cat: undefined, rel: undefined, gp: undefined })
					}
					style={{ alignSelf: "flex-start" }}
				>
					Limpar filtros
				</Button>
			)}
		</Stack>
	);
}
