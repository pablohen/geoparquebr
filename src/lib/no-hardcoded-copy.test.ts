import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSync } from "vite";
import { expect, test } from "vitest";

// UI copy lives in messages/{locale}.json (used through m.*), so every string ships in both
// pt-BR and English. This flags text written straight into components: JSX text, copy-bearing
// props ("label", "placeholder"…) and sentence-like strings in expressions.

// Every component and page, plus the modules that build labels and page metadata.
const FILES = [
	...readdirSync("src", { recursive: true, encoding: "utf8" })
		.filter((f) => f.endsWith(".tsx") && !f.startsWith("paraglide"))
		.map((f) => join("src", f)),
	"src/features/geosites/labels.ts",
	"src/features/geosites/seo.ts",
	"src/lib/site.ts",
];

/** Props whose string values people read. */
const COPY_PROPS = new Set([
	"label",
	"placeholder",
	"title",
	"aria-label",
	"description",
	"alt",
	"note",
	"nothingFoundMessage",
	"emptyMessage",
]);

/** Literal strings that aren't copy even though they look like it. */
const ALLOWED = new Set<string>([
	// The same in both languages.
	"Latitude",
	"Longitude",
	// A map style font, and messages for developers (console, errors).
	"Noto Sans Bold",
	"service worker registration failed:",
	"SGB tile",
]);

const hasWords = (s: string) => /\p{L}{2,}/u.test(s);
// A string in code is copy if it reads like text: words separated by spaces, or accented letters.
// Braces and angle brackets mean code (an inline script, XML), which copy never contains.
// CSS values (gradients, shadows, variables) aren't copy either.
const looksLikeCss = (s: string) =>
	/^[a-z-]+\(|var\(--|\d(px|rem|em)\b/.test(s);
const looksLikeCopy = (s: string) =>
	hasWords(s) &&
	!looksLikeCss(s) &&
	!/[{}<>]/.test(s) &&
	(/\p{L}\s+\p{L}/u.test(s) || /[À-ú]/.test(s));

type Node = { type: string; [key: string]: unknown };

function findCopy(source: string): string[] {
	const found: string[] = [];
	const visit = (node: unknown, parentKey?: string) => {
		if (!node || typeof node !== "object") return;
		if (Array.isArray(node)) {
			for (const n of node) visit(n, parentKey);
			return;
		}
		const n = node as Node;
		if (n.type === "ImportDeclaration" || n.type === "ExportAllDeclaration")
			return;
		if (n.type === "JSXAttribute") {
			const name = (n.name as { name: string }).name;
			if (["style", "styles", "className", "key"].includes(name)) return;
			const value = n.value as Node | null;
			if (value?.type === "Literal") {
				const text = String(value.value);
				if (COPY_PROPS.has(name) && hasWords(text) && !ALLOWED.has(text))
					found.push(text);
				return;
			}
		}
		if (n.type === "JSXText") {
			const text = String(n.value).trim();
			if (hasWords(text) && !ALLOWED.has(text)) found.push(text);
		}
		if (n.type === "Literal" && typeof n.value === "string") {
			const text = n.value;
			if (parentKey !== "key" && looksLikeCopy(text) && !ALLOWED.has(text))
				found.push(text);
		}
		if (n.type === "TemplateElement") {
			const text = (n.value as { cooked: string }).cooked;
			if (looksLikeCopy(text) && !ALLOWED.has(text.trim()))
				found.push(text.trim());
		}
		for (const [key, child] of Object.entries(n))
			if (key !== "type") visit(child, key);
	};
	visit(parseSync("file.tsx", source).program);
	return found;
}

test.each(FILES)("%s has no hard-coded UI copy", (file) => {
	expect(findCopy(readFileSync(file, "utf8"))).toEqual([]);
});
