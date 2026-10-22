import {
	Group,
	Loader,
	Select,
	type SelectProps,
	Stack,
	Text,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
	Bone,
	MagnifyingGlass,
	MapPin,
	MapTrifold,
	Mountains,
	Stack as Stack3,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { searchFossilGeneraFn } from "~/features/fossils/fossils.functions";
import { GEOPARKS } from "~/features/geoparks/geoparks";
import { matchGeoparks } from "~/features/geoparks/search";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { regionLabel } from "~/features/states/labels";
import { matchRegions, matchStates } from "~/features/states/search";
import { stateName } from "~/features/states/states";
import { searchUnitsFn } from "~/features/units/units.functions";
import { useIsMobile } from "~/lib/use-is-mobile";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import type { Place } from "../schemas";
import { searchGeositesFn, searchPlacesFn } from "../search.functions";

type Props = {
	onSelectGeosite: (slug: string) => void;
	onSelectPlace: (place: Place) => void;
};

/** Option values are prefixed so one list can carry every kind. */
const GEOPARK = "geopark:";
const GEOSITE = "geosite:";
const PLACE = "place:";
const FOSSIL = "fossil:";
const STATE = "state:";
const REGION = "region:";
const UNIT = "unit:";

export function SearchBox({ onSelectGeosite, onSelectPlace }: Props) {
	const isMobile = useIsMobile();
	const navigate = useNavigate();
	const [value, setValue] = useState("");
	const [q] = useDebouncedValue(value.trim(), 250);
	const enabled = q.length >= 2;
	const key = enabled ? q.toLowerCase() : null;
	const geositeResults = useServerQuery(key && `search:geosites:${key}`, () =>
		searchGeositesFn({ data: { q } }),
	);
	const placeResults = useServerQuery(key && `search:places:${key}`, () =>
		searchPlacesFn({ data: { q } }),
	);
	const fossilResults = useServerQuery(key && `search:fossils:${key}`, () =>
		searchFossilGeneraFn({ data: { q } }),
	);
	const unitResults = useServerQuery(key && `search:units:${key}`, () =>
		searchUnitsFn({ data: { q } }),
	);
	const pending =
		geositeResults.status === "pending" ||
		placeResults.status === "pending" ||
		fossilResults.status === "pending" ||
		unitResults.status === "pending";

	const geosites = geositeResults.data ?? [];
	const places = placeResults.data ?? [];
	const fossils = fossilResults.data ?? [];
	const units = unitResults.data ?? [];
	// Matched locally, so they show before the server answers.
	const geoparks = enabled ? matchGeoparks(q) : [];
	const states = enabled ? matchStates(q) : [];
	const regions = enabled ? matchRegions(q) : [];
	const data = [
		{
			group: m.search_group_geoparks(),
			items: geoparks.map((id) => ({
				value: `${GEOPARK}${id}`,
				label: geoparkIdLabel(id),
			})),
		},
		{
			group: m.search_group_areas(),
			items: [
				...regions.map((r) => ({
					value: `${REGION}${r}`,
					label: m.region_of_state({ name: regionLabel(r) }),
				})),
				...states.map((uf) => ({
					value: `${STATE}${uf}`,
					label: stateName(uf),
				})),
			],
		},
		{
			group: m.search_group_geosites(),
			items: geosites.map((g) => ({
				value: `${GEOSITE}${g.slug}`,
				label: g.name,
			})),
		},
		{
			group: m.search_group_units(),
			items: units.map((u) => ({ value: `${UNIT}${u.slug}`, label: u.name })),
		},
		{
			group: m.search_group_fossils(),
			items: fossils.map((f) => ({
				value: `${FOSSIL}${f.slug}`,
				label: f.name,
			})),
		},
		{
			group: m.search_group_places(),
			items: places.map((p) => ({ value: `${PLACE}${p.id}`, label: p.name })),
		},
	].filter((g) => g.items.length > 0);

	const subtitle = new Map<string, string>([
		...geoparks.map((id): [string, string] => [
			`${GEOPARK}${id}`,
			m.geopark_designated({ year: GEOPARKS[id].designated }),
		]),
		...states.map((uf): [string, string] => [
			`${STATE}${uf}`,
			m.search_state({ uf }),
		]),
		...units.map((u): [string, string] => [
			`${UNIT}${u.slug}`,
			m.timeline_geosites_count({ count: u.geositeCount }),
		]),
		...geosites.map((g): [string, string] => [
			`${GEOSITE}${g.slug}`,
			`${g.municipality} – ${g.state}`,
		]),
		...fossils.map((f): [string, string] => [
			`${FOSSIL}${f.slug}`,
			[f.group, m.fossils_geosites_count({ count: f.geositeCount })]
				.filter(Boolean)
				.join(" · "),
		]),
		...places.map((p): [string, string] => [
			`${PLACE}${p.id}`,
			[p.context, p.kind?.replace(/_/g, " ")].filter(Boolean).join(" · "),
		]),
	]);

	const renderOption: SelectProps["renderOption"] = ({ option }) => {
		const icon = option.value.startsWith(GEOPARK) ? (
			<MapTrifold size={16} weight="duotone" />
		) : option.value.startsWith(GEOSITE) ? (
			<Mountains size={16} weight="duotone" />
		) : option.value.startsWith(FOSSIL) ? (
			<Bone size={16} weight="duotone" />
		) : option.value.startsWith(UNIT) ? (
			<Stack3 size={16} weight="duotone" />
		) : option.value.startsWith(STATE) || option.value.startsWith(REGION) ? (
			<MapTrifold size={16} />
		) : (
			<MapPin size={16} />
		);
		return (
			<Group gap="xs" wrap="nowrap">
				{icon}
				<Stack gap={0}>
					<Text
						size="sm"
						fs={option.value.startsWith(FOSSIL) ? "italic" : undefined}
					>
						{option.label}
					</Text>
					<Text size="xs" c="dimmed">
						{subtitle.get(option.value)}
					</Text>
				</Stack>
			</Group>
		);
	};

	return (
		<Select
			searchable
			aria-label={m.search_aria()}
			placeholder={
				isMobile ? m.search_placeholder_short() : m.search_placeholder()
			}
			leftSection={<MagnifyingGlass size={16} />}
			rightSection={enabled && pending ? <Loader size={14} /> : null}
			// A command-style search: nothing stays selected after picking.
			value={null}
			searchValue={value}
			onSearchChange={setValue}
			data={data}
			// Results are already ranked server-side; don't re-filter by label.
			filter={({ options }) => options}
			renderOption={renderOption}
			nothingFoundMessage={
				enabled && !pending ? m.search_nothing_found() : undefined
			}
			limit={20}
			maxDropdownHeight={360}
			// On phones the input spans the header, so match its width.
			comboboxProps={{
				width: isMobile ? "target" : 380,
				position: "bottom-start",
			}}
			onChange={(selected) => {
				if (!selected) return;
				if (selected.startsWith(GEOPARK))
					navigate({
						to: "/geoparks/$geoparkId",
						params: { geoparkId: selected.slice(GEOPARK.length) },
					});
				else if (selected.startsWith(GEOSITE))
					onSelectGeosite(selected.slice(GEOSITE.length));
				else if (selected.startsWith(FOSSIL))
					navigate({
						to: "/fossils/$genus",
						params: { genus: selected.slice(FOSSIL.length) },
					});
				else if (selected.startsWith(UNIT))
					navigate({
						to: "/units/$slug",
						params: { slug: selected.slice(UNIT.length) },
					});
				else if (selected.startsWith(STATE))
					navigate({
						to: "/states/$uf",
						params: { uf: selected.slice(STATE.length).toLowerCase() },
					});
				else if (selected.startsWith(REGION))
					navigate({
						to: "/regions/$region",
						params: { region: selected.slice(REGION.length) },
					});
				else {
					const place = places.find((p) => `${PLACE}${p.id}` === selected);
					if (place) onSelectPlace(place);
				}
				setValue("");
			}}
			w={{ base: "100%", sm: 320 }}
			maw={{ base: "none", sm: 320 }}
		/>
	);
}
