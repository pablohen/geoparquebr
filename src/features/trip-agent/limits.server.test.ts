import { describe, expect, it } from "vitest";
import {
	carriesMessage,
	clientIp,
	isSendPath,
	limitConfig,
	visitorId,
} from "./limits.server";

describe("limitConfig", () => {
	it("defaults to 20 per visitor and 200 a day", () => {
		expect(limitConfig({})).toEqual({ visitor: 20, daily: 200 });
	});

	it("reads positive whole numbers and ignores anything else", () => {
		expect(
			limitConfig({
				TRIP_AGENT_VISITOR_LIMIT: "5",
				TRIP_AGENT_DAILY_LIMIT: "50",
			}),
		).toEqual({ visitor: 5, daily: 50 });
		expect(
			limitConfig({
				TRIP_AGENT_VISITOR_LIMIT: "0",
				TRIP_AGENT_DAILY_LIMIT: "1.5",
			}),
		).toEqual({ visitor: 20, daily: 200 });
	});
});

describe("clientIp", () => {
	it("takes the first x-forwarded-for entry", () => {
		const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
		expect(clientIp(headers)).toBe("203.0.113.7");
	});

	it("falls back to x-real-ip, then null", () => {
		expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
			"198.51.100.2",
		);
		expect(clientIp(new Headers())).toBeNull();
	});
});

describe("visitorId", () => {
	it("is stable within a day and changes the next", () => {
		const a = visitorId("203.0.113.7", "2026-11-20", "salt");
		expect(visitorId("203.0.113.7", "2026-11-20", "salt")).toBe(a);
		expect(visitorId("203.0.113.7", "2026-11-21", "salt")).not.toBe(a);
	});

	it("never contains the IP", () => {
		expect(visitorId("203.0.113.7", "2026-11-20", "salt")).not.toContain("203");
	});
});

describe("which requests count", () => {
	const post = (path: string, body?: unknown) =>
		new Request(`http://localhost${path}`, {
			method: "POST",
			...(body !== undefined && { body: JSON.stringify(body) }),
		});

	it("matches session create and send, not cancel or streams", () => {
		expect(isSendPath("POST", "/eve/v1/session")).toBe(true);
		expect(isSendPath("POST", "/eve/v1/session/wrun_1")).toBe(true);
		expect(isSendPath("POST", "/eve/v1/session/wrun_1/cancel")).toBe(false);
		expect(isSendPath("GET", "/eve/v1/session/wrun_1/stream")).toBe(false);
	});

	it("counts only requests that carry a message", async () => {
		expect(
			await carriesMessage(post("/eve/v1/session", { message: "oi" })),
		).toBe(true);
		expect(await carriesMessage(post("/eve/v1/session"))).toBe(false);
		expect(
			await carriesMessage(
				post("/eve/v1/session/wrun_1/cancel", { message: "x" }),
			),
		).toBe(false);
	});

	it("leaves the body for eve to read", async () => {
		const request = post("/eve/v1/session", { message: "oi" });
		await carriesMessage(request);
		expect(await request.json()).toEqual({ message: "oi" });
	});
});
