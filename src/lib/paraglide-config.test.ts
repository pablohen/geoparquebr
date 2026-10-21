import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Regression: `pnpm typecheck` (Paraglide CLI) and `pnpm build` wrote
// message-modules into src/paraglide while `pnpm dev` and `pnpm test` wrote
// locale-modules, and every compile first wiped the folder. Running one while
// the dev server was up broke it ("Failed to load url …/actions_directions.js",
// 500s). All compilers must write the same layout, in place.
const read = (path: string) => readFileSync(path, "utf8");

test("the Paraglide CLI writes locale-modules in place", () => {
	const { scripts } = JSON.parse(read("package.json")) as {
		scripts: Record<string, string>;
	};
	expect(scripts.i18n).toContain("--output-structure locale-modules");
	expect(scripts.i18n).toContain("--no-clean-outdir");
});

test.each(["vite.config.ts", "vitest.config.ts"])(
	"%s compiles messages the same way",
	(path) => {
		const config = read(path);
		expect(config).toContain('outputStructure: "locale-modules"');
		expect(config).toContain("cleanOutdir: false");
	},
);
