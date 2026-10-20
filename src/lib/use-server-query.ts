import { useEffect, useState } from "react";

type QueryState<T> =
	| { status: "idle"; data?: undefined; error?: undefined }
	| { status: "pending"; data?: undefined; error?: undefined }
	| { status: "success"; data: T; error?: undefined }
	| { status: "error"; data?: undefined; error: unknown };

/** Settled values and in-flight promises, shared across components. */
const cache = new Map<string, { promise: Promise<unknown>; value?: unknown }>();

/**
 * Minimal client-side fetch-and-cache for data that isn't worth a route
 * loader (drawer details, per-geosite lookups). `key` identifies the request;
 * pass `null` to skip. Failed requests are evicted so they can be retried.
 */
export function useServerQuery<T>(
	key: string | null,
	load: () => Promise<T>,
): QueryState<T> {
	const cached = key ? cache.get(key) : undefined;
	const [state, setState] = useState<QueryState<T>>(() =>
		!key
			? { status: "idle" }
			: cached && "value" in cached
				? { status: "success", data: cached.value as T }
				: { status: "pending" },
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` identifies `load`.
	useEffect(() => {
		if (!key) {
			setState({ status: "idle" });
			return;
		}
		let entry = cache.get(key);
		if (entry && "value" in entry) {
			setState({ status: "success", data: entry.value as T });
			return;
		}
		if (!entry) {
			const created: { promise: Promise<unknown>; value?: unknown } = {
				promise: load().then((value) => {
					created.value = value;
					return value;
				}),
			};
			created.promise.catch(() => cache.delete(key));
			cache.set(key, created);
			entry = created;
		}

		let active = true;
		setState({ status: "pending" });
		entry.promise.then(
			(data) => active && setState({ status: "success", data: data as T }),
			(error: unknown) => active && setState({ status: "error", error }),
		);
		return () => {
			active = false;
		};
	}, [key]);

	return state;
}
