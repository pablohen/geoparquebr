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

export const STATES_PATH = "/states";
/** `/states/pe`: the URL uses the lower-case code. */
export const statePath = (uf: Uf) => `${STATES_PATH}/${uf.toLowerCase()}`;
export const stateName = (uf: Uf) => STATES[uf];
