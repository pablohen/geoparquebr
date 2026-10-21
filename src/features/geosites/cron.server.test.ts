import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron.server";

const request = (authorization?: string) =>
	new Request("https://example.org/api/cron/sync-geosites", {
		headers: authorization ? { authorization } : {},
	});

describe("isAuthorizedCron", () => {
	it("accepts Vercel's bearer token", () => {
		expect(isAuthorizedCron(request("Bearer s3cret"), "s3cret")).toBe(true);
	});

	it("rejects a missing or wrong token", () => {
		expect(isAuthorizedCron(request(), "s3cret")).toBe(false);
		expect(isAuthorizedCron(request("Bearer nope"), "s3cret")).toBe(false);
		expect(isAuthorizedCron(request("s3cret"), "s3cret")).toBe(false);
	});

	it("rejects everything when no secret is configured", () => {
		expect(isAuthorizedCron(request("Bearer "), "")).toBe(false);
		expect(isAuthorizedCron(request("Bearer undefined"), undefined)).toBe(
			false,
		);
	});
});
