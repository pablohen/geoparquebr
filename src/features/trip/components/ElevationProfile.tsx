import {
	Box,
	Loader,
	Paper,
	Stack,
	Text,
	Title,
	VisuallyHidden,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { type KeyboardEvent, useEffect, useState } from "react";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import {
	niceTicks,
	type ProfileSample,
	profileStats,
	profileZoom,
	samplePath,
} from "../elevation";
import { elevationsAt } from "../elevation-tiles";

type Props = {
	/** The path in order: the start (if any) and the stops' public points. */
	points: [number, number][];
	/** One label per point ("1", "2"… or the start's), drawn at its marker. */
	labels: string[];
};

type Profile =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ok"; samples: ProfileSample[]; elevations: number[] };

const HEIGHT = 180;
const MARGIN = { top: 16, right: 12, bottom: 24, left: 48 };

/**
 * Altitude along the trip's straight legs, read on the device from the
 * relief tiles. A crosshair (pointer or arrow keys) reads any point off it.
 */
export function ElevationProfile({ points, labels }: Props) {
	const key = JSON.stringify(points);
	const [profile, setProfile] = useState<Profile>({ status: "loading" });

	// biome-ignore lint/correctness/useExhaustiveDependencies: `key` encodes `points`.
	useEffect(() => {
		const samples = samplePath(points);
		if (samples.length === 0) return;
		const controller = new AbortController();
		setProfile({ status: "loading" });
		const length = samples.at(-1)?.meters ?? 0;
		elevationsAt(
			samples.map((s) => s.point),
			profileZoom(length),
			controller.signal,
		)
			.then((elevations) => setProfile({ status: "ok", samples, elevations }))
			.catch(() => {
				if (!controller.signal.aborted) setProfile({ status: "error" });
			});
		return () => controller.abort();
	}, [key]);

	return (
		<Stack gap={6} component="section">
			<Title order={2} size="h5">
				{m.trip_profile_title()}
			</Title>
			{profile.status === "loading" ? (
				<Loader size="sm" type="dots" />
			) : profile.status === "error" ? (
				<Text size="sm" c="dimmed">
					{m.trip_profile_error()}
				</Text>
			) : (
				<Chart
					samples={profile.samples}
					elevations={profile.elevations}
					labels={labels}
				/>
			)}
			<Text size="xs" c="dimmed">
				{m.trip_profile_note()}
			</Text>
		</Stack>
	);
}

function Chart({
	samples,
	elevations,
	labels,
}: {
	samples: ProfileSample[];
	elevations: number[];
	labels: string[];
}) {
	const { ref, width } = useElementSize();
	const [active, setActive] = useState<number>();
	const stats = profileStats(elevations);
	const length = samples.at(-1)?.meters ?? 1;
	const yTicks = niceTicks(stats.min, stats.max);
	const yMin = Math.min(yTicks[0] ?? stats.min, stats.min);
	const yMax = Math.max(yTicks.at(-1) ?? stats.max, stats.max);
	const plotW = Math.max(0, width - MARGIN.left - MARGIN.right);
	const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
	const x = (meters: number) => MARGIN.left + (meters / length) * plotW;
	const y = (metres: number) =>
		MARGIN.top + plotH - ((metres - yMin) / Math.max(1, yMax - yMin)) * plotH;
	const xTicks = niceTicks(0, length / 1_000, 4).filter(
		(km) => km * 1_000 <= length,
	);
	const number = new Intl.NumberFormat(getLocale(), {
		maximumFractionDigits: 0,
	});

	const line = samples
		.map(
			(s, i) =>
				`${i === 0 ? "M" : "L"}${x(s.meters).toFixed(1)},${y(elevations[i] ?? 0).toFixed(1)}`,
		)
		.join("");
	const area = `${line}L${x(length).toFixed(1)},${MARGIN.top + plotH}L${MARGIN.left},${MARGIN.top + plotH}Z`;

	// The first sample, then the last of each leg: one per point.
	const stops = [
		0,
		...samples.flatMap((s, i) => (samples[i + 1]?.leg !== s.leg ? [i] : [])),
	];

	const nearest = (clientX: number, rect: DOMRect) => {
		const meters = ((clientX - rect.left - MARGIN.left) / plotW) * length;
		let best = 0;
		for (let i = 1; i < samples.length; i++)
			if (
				Math.abs((samples[i]?.meters ?? 0) - meters) <
				Math.abs((samples[best]?.meters ?? 0) - meters)
			)
				best = i;
		return best;
	};
	const onKey = (e: KeyboardEvent) => {
		const step = e.shiftKey ? 10 : 1;
		if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
			e.preventDefault();
			const by = e.key === "ArrowRight" ? step : -step;
			setActive((current) => {
				const from = current ?? (by > 0 ? -by : samples.length - by);
				return Math.max(0, Math.min(samples.length - 1, from + by));
			});
		} else if (e.key === "Escape") setActive(undefined);
	};

	const readout =
		active === undefined
			? undefined
			: m.trip_profile_readout({
					km: number.format((samples[active]?.meters ?? 0) / 1_000),
					metres: number.format(elevations[active] ?? 0),
				});

	return (
		<Stack gap={4}>
			<Text size="sm">
				{m.trip_profile_summary({
					min: number.format(stats.min),
					max: number.format(stats.max),
					ascent: number.format(stats.ascent),
					descent: number.format(stats.descent),
				})}
			</Text>
			<Box ref={ref} pos="relative">
				{width > 0 && (
					<svg
						width={width}
						height={HEIGHT}
						role="img"
						aria-label={m.trip_profile_aria()}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: arrow keys move the crosshair.
						tabIndex={0}
						onKeyDown={onKey}
						onPointerMove={(e) =>
							setActive(
								nearest(e.clientX, e.currentTarget.getBoundingClientRect()),
							)
						}
						onPointerLeave={() => setActive(undefined)}
						onBlur={() => setActive(undefined)}
						style={{ display: "block", touchAction: "pan-y", outlineOffset: 2 }}
					>
						{yTicks.map((t) => (
							<g key={`y${t}`}>
								<line
									x1={MARGIN.left}
									x2={MARGIN.left + plotW}
									y1={y(t)}
									y2={y(t)}
									stroke="var(--mantine-color-default-border)"
									strokeWidth={1}
								/>
								<text
									x={MARGIN.left - 6}
									y={y(t)}
									dy="0.32em"
									textAnchor="end"
									fontSize={11}
									fill="var(--mantine-color-dimmed)"
								>
									{number.format(t)} m
								</text>
							</g>
						))}
						{xTicks.map((km) => (
							<text
								key={`x${km}`}
								x={x(km * 1_000)}
								y={HEIGHT - 6}
								textAnchor="middle"
								fontSize={11}
								fill="var(--mantine-color-dimmed)"
							>
								{number.format(km)} km
							</text>
						))}
						<path d={area} fill="var(--profile-line)" fillOpacity={0.1} />
						<path
							d={line}
							fill="none"
							stroke="var(--profile-line)"
							strokeWidth={2}
							strokeLinejoin="round"
							strokeLinecap="round"
						/>
						{stops.map((i, n) => (
							<g key={`s${i}`}>
								<circle
									cx={x(samples[i]?.meters ?? 0)}
									cy={y(elevations[i] ?? 0)}
									r={4}
									fill="var(--profile-line)"
									stroke="var(--mantine-color-body)"
									strokeWidth={2}
								/>
								<text
									x={x(samples[i]?.meters ?? 0)}
									y={y(elevations[i] ?? 0) - 9}
									textAnchor="middle"
									fontSize={11}
									fontWeight={600}
									fill="var(--mantine-color-text)"
									// A halo keeps the number legible where the line crosses it.
									stroke="var(--mantine-color-body)"
									strokeWidth={3}
									paintOrder="stroke"
								>
									{labels[n]}
								</text>
							</g>
						))}
						{active !== undefined && (
							<g pointerEvents="none">
								<line
									x1={x(samples[active]?.meters ?? 0)}
									x2={x(samples[active]?.meters ?? 0)}
									y1={MARGIN.top}
									y2={MARGIN.top + plotH}
									stroke="var(--mantine-color-dimmed)"
									strokeWidth={1}
								/>
								<circle
									cx={x(samples[active]?.meters ?? 0)}
									cy={y(elevations[active] ?? 0)}
									r={4}
									fill="var(--profile-line)"
									stroke="var(--mantine-color-body)"
									strokeWidth={2}
								/>
							</g>
						)}
					</svg>
				)}
				{active !== undefined && readout && (
					<Paper
						pos="absolute"
						top={0}
						left={Math.min(
							Math.max(0, x(samples[active]?.meters ?? 0) - 60),
							Math.max(0, width - 130),
						)}
						px={8}
						py={4}
						shadow="sm"
						radius="sm"
						withBorder
						style={{ pointerEvents: "none" }}
					>
						<Text size="xs">{readout}</Text>
					</Paper>
				)}
				<VisuallyHidden aria-live="polite">{readout}</VisuallyHidden>
			</Box>
		</Stack>
	);
}
