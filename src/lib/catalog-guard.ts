/**
 * Message keys in a catalog that the compiled Paraglide output doesn't export.
 * Paraglide still reports success when its inlang plugins fail to load, and
 * then emits no messages; a build that shipped that would fail on every page.
 */
export function missingMessages(
	catalog: Record<string, unknown>,
	compiledIndex: string,
): string[] {
	const exported = new Set(
		[
			...compiledIndex.matchAll(
				/^export (?:const (\w+)|\* from '\.\/(\w+)\.js')/gm,
			),
		].map((m) => m[1] ?? m[2]),
	);
	return Object.keys(catalog).filter(
		(key) => key !== "$schema" && !exported.has(key),
	);
}
