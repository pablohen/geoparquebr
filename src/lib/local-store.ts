/**
 * A value kept in localStorage and shared live by every component and tab
 * (useSyncExternalStore). Reads fall back to `empty` when storage is blocked
 * or holds junk; SSR and hydration always see `empty`.
 */
import { useSyncExternalStore } from "react";

export function createLocalStore<T>(
	key: string,
	parse: (raw: string | null) => T,
	empty: T,
) {
	const listeners = new Set<() => void>();
	let cache: { raw: string | null; value: T } | null = null;

	function read(): T {
		let raw: string | null = null;
		try {
			raw = localStorage.getItem(key);
		} catch {
			// Storage blocked (private mode, settings): behave as empty.
		}
		if (cache === null || cache.raw !== raw) cache = { raw, value: parse(raw) };
		return cache.value;
	}

	function write(next: T) {
		const raw = JSON.stringify(next);
		try {
			localStorage.setItem(key, raw);
		} catch {
			// Quota or blocked storage: keep the change for this page's life.
		}
		cache = { raw, value: next };
		for (const l of listeners) l();
	}

	function subscribe(listener: () => void) {
		listeners.add(listener);
		const onStorage = (e: StorageEvent) => {
			if (e.key === key) listener();
		};
		window.addEventListener("storage", onStorage);
		return () => {
			listeners.delete(listener);
			window.removeEventListener("storage", onStorage);
		};
	}

	return {
		read,
		write,
		use: () => useSyncExternalStore(subscribe, read, () => empty),
	};
}
