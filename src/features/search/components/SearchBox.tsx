import {
	Group,
	Loader,
	Select,
	type SelectProps,
	Stack,
	Text,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { MagnifyingGlass, MapPin, Mountains } from "@phosphor-icons/react";
import { useState } from "react";
import { useIsMobile } from "~/lib/use-is-mobile";
import { useServerQuery } from "~/lib/use-server-query";
import type { Place } from "../schemas";
import { searchGeositesFn, searchPlacesFn } from "../search.functions";

type Props = {
	onSelectGeosite: (slug: string) => void;
	onSelectPlace: (place: Place) => void;
};

/** Option values are prefixed so one list can carry both kinds. */
const GEOSITE = "geosite:";
const PLACE = "place:";

export function SearchBox({ onSelectGeosite, onSelectPlace }: Props) {
	const isMobile = useIsMobile();
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
	const pending =
		geositeResults.status === "pending" || placeResults.status === "pending";

	const geosites = geositeResults.data ?? [];
	const places = placeResults.data ?? [];
	const data = [
		{
			group: "Geossítios",
			items: geosites.map((g) => ({
				value: `${GEOSITE}${g.slug}`,
				label: g.name,
			})),
		},
		{
			group: "Lugares",
			items: places.map((p) => ({ value: `${PLACE}${p.id}`, label: p.name })),
		},
	].filter((g) => g.items.length > 0);

	const subtitle = new Map<string, string>([
		...geosites.map((g): [string, string] => [
			`${GEOSITE}${g.slug}`,
			`${g.municipality} – ${g.state}`,
		]),
		...places.map((p): [string, string] => [
			`${PLACE}${p.id}`,
			[p.context, p.kind?.replace(/_/g, " ")].filter(Boolean).join(" · "),
		]),
	]);

	const renderOption: SelectProps["renderOption"] = ({ option }) => {
		const isGeosite = option.value.startsWith(GEOSITE);
		return (
			<Group gap="xs" wrap="nowrap">
				{isGeosite ? (
					<Mountains size={16} weight="duotone" />
				) : (
					<MapPin size={16} />
				)}
				<Stack gap={0}>
					<Text size="sm">{option.label}</Text>
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
			aria-label="Buscar geossítios e lugares"
			placeholder={
				isMobile ? "Buscar…" : "Buscar geossítio, município ou lugar…"
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
			nothingFoundMessage={enabled && !pending ? "Nada encontrado" : undefined}
			limit={20}
			maxDropdownHeight={360}
			// On phones the input spans the header, so match its width.
			comboboxProps={{
				width: isMobile ? "target" : 380,
				position: "bottom-start",
			}}
			onChange={(selected) => {
				if (!selected) return;
				if (selected.startsWith(GEOSITE))
					onSelectGeosite(selected.slice(GEOSITE.length));
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
