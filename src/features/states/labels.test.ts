import { describe, expect, it } from "vitest";
import { statesLabel } from "./labels";
import { REGIONS } from "./states";

describe("statesLabel", () => {
	it("names a whole region by the region", () => {
		expect(statesLabel([...REGIONS.sul])).toBe("Sul");
	});

	it("lists other sets of states by name", () => {
		expect(statesLabel(["PE"])).toBe("Pernambuco");
		expect(statesLabel(["SP", "MG"])).toBe("Minas Gerais, São Paulo");
		expect(statesLabel(["PR", "SC"])).toBe("Paraná, Santa Catarina");
	});
});
