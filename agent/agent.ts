import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";

// Gemini's free tier (Google AI Studio key in GOOGLE_GENERATIVE_AI_API_KEY,
// no card), called directly rather than through AI Gateway. GEMINI_MODEL
// switches models when one's free quota runs short.
const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";

// A public site's trip helper that answers from our own data: no built-in
// tools (shell, files, web), only agent/tools/*.
export default defineAgent({
	model: google(model),
	modelContextWindowTokens: 1_000_000,
	defaultTools: false,
	limits: { sessionTimeoutMs: 30 * 60_000 },
});
