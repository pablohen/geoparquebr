import { describe, expect, it } from "vitest";
import { GEOSITE_CATEGORIES } from "~/features/geosites/schemas";
import { GLOSSARY, scoreAnchor, themeAnchor } from "./glossary";

const ids = GLOSSARY.flatMap((s) => [s.id, ...s.entries.map((e) => e.id)]);

describe("glossary", () => {
	it("uses each anchor once", () => {
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("defines every theme and score that pages link to", () => {
		for (const c of GEOSITE_CATEGORIES) expect(ids).toContain(themeAnchor(c));
		for (const k of [
			"scientific",
			"tourism",
			"didactic",
			"vulnerability",
		] as const)
			expect(ids).toContain(scoreAnchor(k));
	});

	it("has copy for every entry", () => {
		for (const e of GLOSSARY.flatMap((s) => s.entries)) {
			expect(e.term().length).toBeGreaterThan(1);
			expect(e.definition().length).toBeGreaterThan(20);
		}
	});
});
