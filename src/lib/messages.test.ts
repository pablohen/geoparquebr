import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { m } from "~/paraglide/messages.js";
import { locales } from "~/paraglide/runtime.js";
import { missingMessages } from "./catalog-guard";

// The catalog compiles even when the inlang plugins fail to load (it then has
// no messages), so these also guard against shipping an empty catalog.

type Catalog = Record<string, unknown>;
const catalog = (locale: string): Catalog => {
	const { $schema: _, ...messages } = JSON.parse(
		readFileSync(`messages/${locale}.json`, "utf8"),
	);
	return messages;
};

/** Every text of a message, including each plural variant. */
const texts = (value: unknown): string[] =>
	typeof value === "string"
		? [value]
		: (value as { match: Record<string, string> }[]).flatMap((v) =>
				Object.values(v.match),
			);
/** `{placeholders}` a text uses. */
const params = (text: string) =>
	[...text.matchAll(/\{(\w+)\}/g)].map((p) => p[1]).sort();

test("every locale has exactly the base locale's keys", () => {
	const base = Object.keys(catalog("pt-BR")).sort();
	expect(base.length).toBeGreaterThan(0);
	for (const locale of locales)
		expect(Object.keys(catalog(locale)).sort(), locale).toEqual(base);
});

test("translations use the same placeholders", () => {
	const pt = catalog("pt-BR");
	const en = catalog("en");
	for (const key of Object.keys(pt))
		expect(params(texts(en[key]).join(" ")), key).toEqual(
			params(texts(pt[key]).join(" ")),
		);
});

test("no message is empty", () => {
	for (const locale of locales)
		for (const [key, value] of Object.entries(catalog(locale)))
			for (const text of texts(value))
				expect(text.trim(), `${locale} ${key}`).not.toBe("");
});

describe("plurals", () => {
	test("zero stays plural in Portuguese (CLDR makes 0 singular)", () => {
		expect(m.sheet_count({ count: 0 })).toBe("0 geossítios");
		expect(m.sheet_count({ count: 1 })).toBe("1 geossítio");
		expect(m.sheet_count({ count: 2 })).toBe("2 geossítios");
	});

	test("English", () => {
		expect(m.sheet_count({ count: 0 }, { locale: "en" })).toBe("0 geosites");
		expect(m.sheet_count({ count: 1 }, { locale: "en" })).toBe("1 geosite");
	});
});

test("missingMessages reports catalog keys the compiled index lacks", () => {
	const index = "export const a = 1;\nexport * from './b.js';\n";
	expect(missingMessages({ $schema: "x", a: "", b: "", c: "" }, index)).toEqual(
		["c"],
	);
});
