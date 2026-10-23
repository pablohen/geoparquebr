import { NavigationProgress, nprogress } from "@mantine/nprogress";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * Mantine fades the bar in over 200 ms; most page changes finish sooner, so
 * it stays (full) for at least this long or it would never show.
 */
const MIN_VISIBLE_MS = 400;

/**
 * A thin bar at the top while a page change loads. Moves within one page
 * (the map's `bbox`, filters) only change search params and are skipped:
 * the map would otherwise run it on every pan.
 */
export function RouteProgress() {
	const changingPage = useRouterState({
		select: (s) =>
			s.status === "pending" &&
			s.location.pathname !== s.resolvedLocation?.pathname,
	});
	const finishing = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		if (!changingPage) return;
		clearTimeout(finishing.current);
		const started = performance.now();
		nprogress.start();
		return () => {
			nprogress.set(100);
			finishing.current = setTimeout(
				() => nprogress.complete(),
				Math.max(0, MIN_VISIBLE_MS - (performance.now() - started)),
			);
		};
	}, [changingPage]);

	return <NavigationProgress size={3} aria-hidden />;
}
