/**
 * Brazil's protected areas (unidades de conservação) from MMA's CNUC
 * register, built by `pnpm geo:protected`. The sync names the areas each
 * geosite lies in; the map draws them as an overlay. Pure, so it can be
 * tested.
 */
import { z } from "zod";
import { inMultiPolygon } from "./placement";

type Point = [number, number];

export const ProtectedAreaSchema = z.object({
	/** CNUC code, e.g. "0000.00.0004". */
	id: z.string(),
	name: z.string(),
	/** "Parque Nacional", "Área de Proteção Ambiental"… as CNUC writes it. */
	category: z.string(),
	/** Federal, Estadual or Municipal. */
	sphere: z.string(),
	/** "Proteção Integral" or "Uso Sustentável". */
	group: z.string(),
});
export type ProtectedArea = z.infer<typeof ProtectedAreaSchema>;

export type ProtectedAreaShape = ProtectedArea & {
	bbox: [number, number, number, number];
	shape: Point[][][];
};

export type ProtectedAreasData = {
	edition: string;
	areas: ProtectedAreaShape[];
};

/** Lower-case words inside Portuguese names ("Parque Nacional da Serra"). */
const PARTICLES = new Set([
	"da",
	"das",
	"de",
	"do",
	"dos",
	"e",
	"em",
	"na",
	"no",
]);

/** CNUC writes names in capitals; "PARQUE NACIONAL DO ITATIAIA" → "Parque Nacional do Itatiaia". */
export function titleCase(name: string): string {
	return name
		.toLocaleLowerCase("pt-BR")
		.split(/(\s+|-|\/|\()/)
		.map((word, i) =>
			i > 0 && PARTICLES.has(word)
				? word
				: word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1),
		)
		.join("")
		.trim();
}

/** A CNUC record's attributes as one area; inactive or unnamed ones are skipped. */
export function toProtectedArea(
	p: Record<string, string | null | undefined>,
): ProtectedArea | null {
	const id = p.cd_cnuc?.trim();
	const name = p.nome_uc?.trim();
	if (!id || !name || p.situacao?.trim() !== "Ativo") return null;
	return {
		id,
		name: titleCase(name),
		category: p.categoria?.trim() || "",
		sphere: p.esfera?.trim() || "",
		group: p.grupo?.trim() || "",
	};
}

/**
 * The areas containing `point`, the strictest protection first (Proteção
 * Integral before Uso Sustentável), then by name.
 */
export function protectedAreasAt(
	point: Point,
	data: ProtectedAreasData,
): ProtectedArea[] {
	const [x, y] = point;
	return data.areas
		.filter(
			({ bbox: [w, s, e, n], shape }) =>
				x >= w && x <= e && y >= s && y <= n && inMultiPolygon(shape, point),
		)
		.map(({ id, name, category, sphere, group }) => ({
			id,
			name,
			category,
			sphere,
			group,
		}))
		.sort(
			(a, b) =>
				Number(b.group === "Proteção Integral") -
					Number(a.group === "Proteção Integral") ||
				a.name.localeCompare(b.name, "pt"),
		);
}
