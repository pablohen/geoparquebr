/**
 * Creates indexes and upserts a few sample geosites.
 * Usage: pnpm db:seed   (reads MONGODB_URI / MONGODB_DB from .env)
 *
 * Coordinates are approximate and for development only.
 */
import {
	ensureGeositeIndexes,
	geositesCollection,
} from "~/features/geosites/geosites.server";
import {
	type GeositeInput,
	GeositeInputSchema,
} from "~/features/geosites/schemas";

const point = (lng: number, lat: number) => ({
	type: "Point" as const,
	coordinates: [lng, lat] as [number, number],
});

const samples: GeositeInput[] = [
	{
		slug: "pedra-cariri",
		name: "Geossítio Pedra Cariri",
		summary:
			"Calcários laminados da Formação Crato com insetos, peixes e plantas fósseis de preservação excepcional.",
		geoparkId: "araripe",
		municipality: "Nova Olinda",
		state: "CE",
		categories: ["paleontological", "stratigraphic"],
		scientificValue: "international",
		geologicAge: {
			period: "Cretáceo Inferior (Aptiano)",
			formation: "Formação Crato",
			minMa: 113,
			maxMa: 115,
		},
		location: point(-39.68, -7.09),
	},
	{
		slug: "parque-dos-pterossauros",
		name: "Geossítio Parque dos Pterossauros",
		summary:
			"Concreções da Formação Romualdo com pterossauros e peixes fósseis tridimensionais.",
		geoparkId: "araripe",
		municipality: "Santana do Cariri",
		state: "CE",
		categories: ["paleontological"],
		scientificValue: "international",
		geologicAge: {
			period: "Cretáceo Inferior (Albiano)",
			formation: "Formação Romualdo",
			minMa: 110,
			maxMa: 113,
		},
		location: point(-39.74, -7.19),
		locationIsSensitive: true,
	},
	{
		slug: "floresta-petrificada-do-cariri",
		name: "Geossítio Floresta Petrificada do Cariri",
		summary:
			"Troncos silicificados de coníferas preservados em arenitos fluviais.",
		geoparkId: "araripe",
		municipality: "Missão Velha",
		state: "CE",
		categories: ["paleontological", "petrological"],
		scientificValue: "national",
		geologicAge: {
			period: "Jurássico Superior",
			formation: "Formação Missão Velha",
		},
		location: point(-39.14, -7.24),
	},
	{
		slug: "batateiras",
		name: "Geossítio Batateiras",
		summary:
			"Nascentes e cachoeiras na encosta da Chapada do Araripe, com arenitos da Formação Exu.",
		geoparkId: "araripe",
		municipality: "Crato",
		state: "CE",
		categories: ["hydrogeological", "geomorphological"],
		scientificValue: "regional",
		location: point(-39.43, -7.25),
	},
	{
		slug: "canion-dos-apertados",
		name: "Geossítio Cânion dos Apertados",
		summary:
			"Cânion escavado pelo rio Picuí em rochas pré-cambrianas do Seridó.",
		geoparkId: "serido",
		municipality: "Currais Novos",
		state: "RN",
		categories: ["geomorphological", "tectonic"],
		scientificValue: "national",
		location: point(-36.51, -6.26),
	},
	{
		slug: "canion-itaimbezinho",
		name: "Cânion Itaimbezinho",
		summary:
			"Cânion de ~700 m de profundidade nos derrames basálticos da Formação Serra Geral.",
		geoparkId: "caminhos-dos-canions-do-sul",
		municipality: "Cambará do Sul",
		state: "RS",
		categories: ["geomorphological", "petrological"],
		scientificValue: "international",
		geologicAge: {
			period: "Cretáceo Inferior",
			formation: "Grupo Serra Geral",
			minMa: 132,
			maxMa: 134,
		},
		location: point(-50.08, -29.16),
	},
	{
		slug: "peiropolis",
		name: "Sítio Paleontológico de Peirópolis",
		summary: "Ossos de titanossauros e crocodiliformes da Formação Marília.",
		geoparkId: "uberaba",
		municipality: "Uberaba",
		state: "MG",
		categories: ["paleontological", "stratigraphic"],
		scientificValue: "international",
		geologicAge: {
			period: "Cretáceo Superior (Maastrichtiano)",
			formation: "Formação Marília",
		},
		location: point(-47.75, -19.72),
	},
];

const col = await geositesCollection();
await ensureGeositeIndexes(col);

const now = new Date();
for (const sample of samples) {
	const { slug, ...rest } = GeositeInputSchema.parse(sample);
	await col.updateOne(
		{ slug },
		{
			$set: { ...rest, updatedAt: now },
			$setOnInsert: { slug, createdAt: now },
		},
		{ upsert: true },
	);
}

console.log(`Seeded ${samples.length} geosites.`);
process.exit(0);
