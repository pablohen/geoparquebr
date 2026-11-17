import { defineAgent } from "eve";

// A public site's trip helper that answers from our own data: cheap and
// fast, and no built-in tools (shell, files, web), only agent/tools/*.
export default defineAgent({
	model: "anthropic/claude-haiku-5.5",
	defaultTools: false,
	limits: { sessionTimeoutMs: 30 * 60_000 },
});
