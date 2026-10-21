import { describe, expect, it } from "vitest";
import { AGE_CATALOG, curatedAge } from "./age-catalog.server";
import { GeositeInputSchema } from "./schemas";

describe("AGE_CATALOG", () => {
	it.each(Object.entries(AGE_CATALOG))(
		"GEOSSIT %s is a valid, sourced age",
		(_, age) => {
			expect(GeositeInputSchema.shape.geologicAge.safeParse(age).success).toBe(
				true,
			);
			expect(age.reference?.url).toMatch(/^https:\/\//);
			// Curated ages aren't read off a map.
			expect(age.mapScale).toBeUndefined();
			expect(age.minMa).toBeDefined();
			expect(age.maxMa).toBeDefined();
		},
	);

	it("dates Pedra Cariri to the Aptian, not the basement under its point", () => {
		expect(curatedAge({ id: 1997 })).toMatchObject({
			formation: "Membro Crato, Formação Santana",
			minMa: 113.2,
			maxMa: 121.4,
		});
		expect(curatedAge({ id: 1 })).toBeUndefined();
	});
});
