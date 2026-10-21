/**
 * Auth for Vercel Cron: Vercel sends `Authorization: Bearer $CRON_SECRET`
 * when the project has a CRON_SECRET. Without one, nothing is authorised, so
 * the sync endpoint can never run open.
 */
import { timingSafeEqual } from "node:crypto";

export function isAuthorizedCron(
	request: Request,
	secret = process.env.CRON_SECRET,
): boolean {
	if (!secret) return false;
	const given = Buffer.from(request.headers.get("authorization") ?? "");
	const expected = Buffer.from(`Bearer ${secret}`);
	return given.length === expected.length && timingSafeEqual(given, expected);
}
