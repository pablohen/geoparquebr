/** Display labels for geological periods, in the current locale. */
import { m } from "~/paraglide/messages.js";
import type { GeologicPeriodId } from "./time-scale";

const PERIOD = {
	quaternary: m.period_quaternary,
	neogene: m.period_neogene,
	paleogene: m.period_paleogene,
	cretaceous: m.period_cretaceous,
	jurassic: m.period_jurassic,
	triassic: m.period_triassic,
	permian: m.period_permian,
	carboniferous: m.period_carboniferous,
	devonian: m.period_devonian,
	silurian: m.period_silurian,
	ordovician: m.period_ordovician,
	cambrian: m.period_cambrian,
	neoproterozoic: m.period_neoproterozoic,
	mesoproterozoic: m.period_mesoproterozoic,
	paleoproterozoic: m.period_paleoproterozoic,
	archean: m.period_archean,
} satisfies Record<GeologicPeriodId, () => string>;

export const periodLabel = (id: GeologicPeriodId) => PERIOD[id]();
