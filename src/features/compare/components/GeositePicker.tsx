import { Select } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { searchGeositesFn } from "~/features/search/search.functions";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";

type Props = {
	label: string;
	/** The chosen geosite, shown as its name. */
	value?: { slug: string; name: string };
	onChange: (slug: string | undefined) => void;
};

/** A geosite search box that picks one geosite. */
export function GeositePicker({ label, value, onChange }: Props) {
	const [search, setSearch] = useState("");
	const [q] = useDebouncedValue(search.trim(), 250);
	const enabled = q.length >= 2 && q !== value?.name;
	const results = useServerQuery(
		enabled ? `pick:${q.toLowerCase()}` : null,
		() => searchGeositesFn({ data: { q } }),
	);
	const hits = enabled ? (results.data ?? []) : [];
	const data = [
		...(value ? [{ value: value.slug, label: value.name }] : []),
		...hits
			.filter((h) => h.slug !== value?.slug)
			.map((h) => ({
				value: h.slug,
				label: `${h.name} (${h.municipality} – ${h.state})`,
			})),
	];
	return (
		<Select
			label={label}
			placeholder={m.cmp_pick_placeholder()}
			leftSection={<MagnifyingGlass size={14} />}
			searchable
			clearable
			data={data}
			value={value?.slug ?? null}
			searchValue={search}
			onSearchChange={setSearch}
			// The server already matched; don't filter again by label.
			filter={({ options }) => options}
			onChange={(slug) => onChange(slug ?? undefined)}
			nothingFoundMessage={
				enabled && results.status === "success"
					? m.search_nothing_found()
					: undefined
			}
		/>
	);
}
