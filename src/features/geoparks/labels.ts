/** Geopark descriptions, in the current locale. */
import type { GeoparkId } from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";

const ABOUT = {
	araripe: m.geopark_about_araripe,
	serido: m.geopark_about_serido,
	"caminhos-dos-canions-do-sul": m.geopark_about_caminhos_dos_canions_do_sul,
	"quarta-colonia": m.geopark_about_quarta_colonia,
	cacapava: m.geopark_about_cacapava,
	uberaba: m.geopark_about_uberaba,
} satisfies Record<GeoparkId, () => string>;

export const geoparkAbout = (id: GeoparkId) => ABOUT[id]();
