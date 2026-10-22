/**
 * Brazil's 26 states and the Federal District. Names are proper nouns,
 * written the same in every language the app speaks. Isomorphic.
 */
export const STATES = {
	AC: "Acre",
	AL: "Alagoas",
	AP: "Amapá",
	AM: "Amazonas",
	BA: "Bahia",
	CE: "Ceará",
	DF: "Distrito Federal",
	ES: "Espírito Santo",
	GO: "Goiás",
	MA: "Maranhão",
	MT: "Mato Grosso",
	MS: "Mato Grosso do Sul",
	MG: "Minas Gerais",
	PA: "Pará",
	PB: "Paraíba",
	PR: "Paraná",
	PE: "Pernambuco",
	PI: "Piauí",
	RJ: "Rio de Janeiro",
	RN: "Rio Grande do Norte",
	RS: "Rio Grande do Sul",
	RO: "Rondônia",
	RR: "Roraima",
	SC: "Santa Catarina",
	SP: "São Paulo",
	SE: "Sergipe",
	TO: "Tocantins",
} as const;

export type Uf = keyof typeof STATES;
export const UFS = Object.keys(STATES) as [Uf, ...Uf[]];

/** Each state's IBGE outline, `{ uf }` per feature (built by `pnpm geo:places`). */
export const STATE_OUTLINES_URL = "/data/state-outlines.geojson";

export const STATES_PATH = "/states";
/** `/states/pe`: the URL uses the lower-case code. */
export const statePath = (uf: Uf) => `${STATES_PATH}/${uf.toLowerCase()}`;
export const stateName = (uf: Uf) => STATES[uf];

/** IBGE's five regions, by URL slug. */
export const REGIONS = {
	norte: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
	nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
	"centro-oeste": ["DF", "GO", "MS", "MT"],
	sudeste: ["ES", "MG", "RJ", "SP"],
	sul: ["PR", "RS", "SC"],
} as const satisfies Record<string, readonly Uf[]>;

export type Region = keyof typeof REGIONS;
export const REGION_IDS = Object.keys(REGIONS) as [Region, ...Region[]];

export const REGIONS_PATH = "/regions";
export const regionPath = (r: Region) => `${REGIONS_PATH}/${r}`;

export const regionOf = (uf: Uf): Region =>
	REGION_IDS.find((r) => (REGIONS[r] as readonly Uf[]).includes(uf)) ?? "norte";
