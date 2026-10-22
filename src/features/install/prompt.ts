/**
 * Browser-side install state. `beforeinstallprompt` can fire before React
 * hydrates, so it is caught as soon as this module loads and kept here.
 */
import { useSyncExternalStore } from "react";
import { createLocalStore } from "~/lib/local-store";
import { type InstallMode, installMode } from "./install";

type PromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: PromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => {
	for (const l of listeners) l();
};

if (typeof window !== "undefined") {
	window.addEventListener("beforeinstallprompt", (e) => {
		// Keep the browser's own mini-infobar away; the button asks instead.
		e.preventDefault();
		deferred = e as PromptEvent;
		notify();
	});
	window.addEventListener("appinstalled", () => {
		installed = true;
		deferred = null;
		notify();
	});
}

/** "Not now" is remembered on this device. */
const dismissedStore = createLocalStore(
	"geoparquebr:install-dismissed:v1",
	(raw) => raw === "true",
	false,
);

function current(): InstallMode {
	const standalone =
		installed ||
		window.matchMedia("(display-mode: standalone)").matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true;
	return installMode({
		standalone,
		userAgent: navigator.userAgent,
		hasPrompt: deferred !== null,
		dismissed: dismissedStore.read(),
	});
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** The install path on offer; null during SSR and hydration. */
export function useInstallMode(): InstallMode {
	dismissedStore.use();
	return useSyncExternalStore(subscribe, current, () => null);
}

/** Shows the browser's install dialog; true if the user installed. */
export async function promptInstall(): Promise<boolean> {
	if (!deferred) return false;
	const event = deferred;
	deferred = null;
	notify();
	await event.prompt();
	return (await event.userChoice).outcome === "accepted";
}

export function dismissInstall() {
	dismissedStore.write(true);
}
