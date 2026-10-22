/** Region names in the current locale. */
import { m } from "~/paraglide/messages.js";
import { REGION_IDS, REGIONS, type Region, stateName, type Uf } from "./states";

const REGION = {
	norte: m.region_norte,
	nordeste: m.region_nordeste,
	"centro-oeste": m.region_centro_oeste,
	sudeste: m.region_sudeste,
	sul: m.region_sul,
} satisfies Record<Region, () => string>;

export const regionLabel = (r: Region) => REGION[r]();

/** A state filter by name: a whole region by its name, else the states'. */
export function statesLabel(ufs: readonly Uf[]): string {
	const set = new Set(ufs);
	const region = REGION_IDS.find(
		(r) =>
			REGIONS[r].length === set.size && REGIONS[r].every((uf) => set.has(uf)),
	);
	return region
		? regionLabel(region)
		: [...set]
				.map(stateName)
				.sort((a, b) => a.localeCompare(b, "pt"))
				.join(", ");
}
