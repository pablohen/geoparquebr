/**
 * A throwaway database name for one integration-test file. Test files run in
 * parallel, so a timestamp alone can repeat, and two files sharing a
 * database drop or count each other's documents.
 */
export function testDbName(prefix = "geoparquebr_test"): string {
	return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}
