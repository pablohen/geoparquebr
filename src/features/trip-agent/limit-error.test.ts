import { describe, expect, it } from "vitest";
import { limitReason } from "./limit-error";

const refusal = (reason: string) => ({
	code: "trip_agent_limit",
	status: 403,
	body: JSON.stringify({
		code: "trip_agent_limit",
		error: `trip_agent_limit:${reason}`,
		ok: false,
	}),
});

describe("limitReason", () => {
	it("tells the visitor limit from the daily one", () => {
		expect(limitReason(refusal("visitor"))).toBe("visitor");
		expect(limitReason(refusal("daily"))).toBe("daily");
	});

	it("ignores other errors", () => {
		expect(limitReason(new Error("boom"))).toBeNull();
		expect(limitReason({ code: "forbidden", body: "" })).toBeNull();
		expect(limitReason(undefined)).toBeNull();
	});
});
