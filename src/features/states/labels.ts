/** Region names in the current locale. */
import { m } from "~/paraglide/messages.js";
import type { Region } from "./states";

const REGION = {
	norte: m.region_norte,
	nordeste: m.region_nordeste,
	"centro-oeste": m.region_centro_oeste,
	sudeste: m.region_sudeste,
	sul: m.region_sul,
} satisfies Record<Region, () => string>;

export const regionLabel = (r: Region) => REGION[r]();
