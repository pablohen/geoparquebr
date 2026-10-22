/**
 * "Instalar app": which install path this browser offers, if any. Chromium
 * browsers fire `beforeinstallprompt`; iOS Safari has no prompt, only "Add to
 * Home Screen" in the share sheet. Pure, so it can be tested.
 */

export type InstallMode = "prompt" | "ios" | null;

export function installMode({
	standalone,
	userAgent,
	hasPrompt,
	dismissed,
}: {
	/** Already running as an installed app. */
	standalone: boolean;
	userAgent: string;
	/** A deferred `beforeinstallprompt` event is waiting. */
	hasPrompt: boolean;
	dismissed: boolean;
}): InstallMode {
	if (standalone || dismissed) return null;
	if (hasPrompt) return "prompt";
	const ios =
		/iPhone|iPad|iPod/.test(userAgent) ||
		// iPadOS reports a Mac; touch tells them apart.
		(/Macintosh/.test(userAgent) && /Mobile\//.test(userAgent));
	// Other iOS browsers (Chrome, Firefox, Edge…) can't add to the home screen.
	const safari =
		/Safari\//.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
	return ios && safari ? "ios" : null;
}
