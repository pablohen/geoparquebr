import { Group, RangeSlider, Stack, Text } from "@mantine/core";
import { type CSSProperties, useEffect, useState } from "react";
import { periodLabel } from "~/features/geology/labels";
import {
	GEOLOGIC_PERIODS,
	type GeologicPeriodId,
} from "~/features/geology/time-scale";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import type { AgeRange } from "../schemas";

/** Oldest → youngest, left to right, like a timeline. */
const TIMELINE = [...GEOLOGIC_PERIODS].reverse();
/** Periods on the track; also the number of the last boundary. */
const N = TIMELINE.length;
const indexOf = (id: GeologicPeriodId) =>
	TIMELINE.findIndex((p) => p.id === id);
const idAt = (i: number): GeologicPeriodId => TIMELINE[i]?.id ?? "archean";

/**
 * The thumbs sit on boundaries between periods (0…N), not on periods: the
 * left one where the oldest selected period's colour starts, the right one
 * where the youngest one's ends. A range [a, b] selects periods a…b-1.
 */
export const boundaryPercent = (k: number) => (k / N) * 100;

/** Age at boundary `k`: the start of period k, or today at the right end. */
const boundaryMa = (k: number) => TIMELINE[k]?.maxMa ?? 0;

/** The ICS chart colours, one equal band per period. */
const TRACK = `linear-gradient(to right, ${TIMELINE.map(
	(p, i) => `${p.color} ${boundaryPercent(i)}% ${boundaryPercent(i + 1)}%`,
).join(", ")})`;

const DIM = "color-mix(in srgb, var(--mantine-color-body) 55%, transparent)";

/** The track with everything outside the selected periods [a, b) dimmed. */
export function trackImage([a, b]: [number, number]): string {
	if (a === 0 && b === N) return TRACK;
	const from = boundaryPercent(a);
	const to = boundaryPercent(b);
	const shade = `linear-gradient(to right, ${DIM} 0% ${from}%, transparent ${from}% ${to}%, ${DIM} ${to}% 100%)`;
	return `${shade}, ${TRACK}`;
}

type Props = {
	value?: AgeRange;
	onChange: (next: AgeRange | undefined) => void;
};

/** Range of geological periods; the full range means "no filter". */
export function AgeFilter({ value, onChange }: Props) {
	// URL value: [youngest, oldest] period → boundaries [oldest, youngest + 1].
	const fromUrl: [number, number] = value
		? [indexOf(value[1]), indexOf(value[0]) + 1]
		: [0, N];
	// Dragging updates the label live; the URL (and the query) on release.
	const [range, setRange] = useState(fromUrl);
	const urlKey = fromUrl.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only when the URL value changes.
	useEffect(() => setRange(fromUrl), [urlKey]);

	const oldest = range[0];
	const youngest = range[1] - 1;
	const all = range[0] === 0 && range[1] === N;

	return (
		<Stack gap={6}>
			<Group justify="space-between" gap="xs" wrap="nowrap">
				<Text size="xs" fw={500}>
					{m.filters_age()}
				</Text>
				<Text size="xs" c="dimmed" ta="right">
					{all
						? m.filters_age_all()
						: oldest === youngest
							? periodLabel(idAt(oldest))
							: m.filters_age_range({
									from: periodLabel(idAt(oldest)),
									to: periodLabel(idAt(youngest)),
								})}
				</Text>
			</Group>
			<RangeSlider
				size="sm"
				min={0}
				max={N}
				step={1}
				// At least one period stays selected.
				minRange={1}
				value={range}
				onChange={setRange}
				onChangeEnd={([a, b]) =>
					onChange(a === 0 && b === N ? undefined : [idAt(b - 1), idAt(a)])
				}
				label={(k) => `${boundaryMa(k).toLocaleString(getLocale())} Ma`}
				thumbFromLabel={m.filters_age_aria_from()}
				thumbToLabel={m.filters_age_aria_to()}
				// Mantine paints the track with a background-color, which can't be a
				// gradient; paint the track element itself and hide that layer.
				style={{ "--slider-track-bg": "transparent" } as CSSProperties}
				styles={{
					track: { backgroundImage: trackImage(range), borderRadius: 999 },
					// The selection shows as the undimmed part of the track.
					bar: { background: "transparent" },
				}}
			/>
			{!all && (
				<Text size="xs" c="dimmed">
					{m.filters_age_hint()}
				</Text>
			)}
		</Stack>
	);
}
