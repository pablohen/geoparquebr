import { Group, RangeSlider, Stack, Text } from "@mantine/core";
import { type CSSProperties, useEffect, useState } from "react";
import { periodLabel } from "~/features/geology/labels";
import {
	GEOLOGIC_PERIODS,
	type GeologicPeriodId,
} from "~/features/geology/time-scale";
import { m } from "~/paraglide/messages.js";
import type { AgeRange } from "../schemas";

/** Oldest → youngest, left to right, like a timeline. */
const TIMELINE = [...GEOLOGIC_PERIODS].reverse();
const LAST = TIMELINE.length - 1;
const indexOf = (id: GeologicPeriodId) =>
	TIMELINE.findIndex((p) => p.id === id);
const idAt = (i: number): GeologicPeriodId => TIMELINE[i]?.id ?? "archean";

/**
 * Where period `i`'s colour band starts and ends on the track, in %. Thumbs
 * sit at i / LAST, so each band is centred there (half bands at the ends).
 */
export const bandEdges = (i: number): [number, number] => [
	Math.max(0, ((i - 0.5) / LAST) * 100),
	Math.min(100, ((i + 0.5) / LAST) * 100),
];

/** The ICS chart colours, one band per period. */
const TRACK = `linear-gradient(to right, ${TIMELINE.map((p, i) => {
	const [from, to] = bandEdges(i);
	return `${p.color} ${from}% ${to}%`;
}).join(", ")})`;

const DIM = "color-mix(in srgb, var(--mantine-color-body) 55%, transparent)";

/** The track with everything outside the selected periods dimmed. */
export function trackImage([oldest, youngest]: [number, number]): string {
	const from = bandEdges(oldest)[0];
	const to = bandEdges(youngest)[1];
	if (from === 0 && to === 100) return TRACK;
	const shade = `linear-gradient(to right, ${DIM} 0% ${from}%, transparent ${from}% ${to}%, ${DIM} ${to}% 100%)`;
	return `${shade}, ${TRACK}`;
}

type Props = {
	value?: AgeRange;
	onChange: (next: AgeRange | undefined) => void;
};

/** Range of geological periods; the full range means "no filter". */
export function AgeFilter({ value, onChange }: Props) {
	const fromUrl: [number, number] = value
		? [indexOf(value[1]), indexOf(value[0])]
		: [0, LAST];
	// Dragging updates the label live; the URL (and the query) on release.
	const [range, setRange] = useState(fromUrl);
	const urlKey = fromUrl.join(",");
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-sync only when the URL value changes.
	useEffect(() => setRange(fromUrl), [urlKey]);

	const [oldest, youngest] = range;
	const all = oldest === 0 && youngest === LAST;

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
				max={LAST}
				step={1}
				minRange={0}
				value={range}
				onChange={setRange}
				onChangeEnd={([o, y]) =>
					onChange(o === 0 && y === LAST ? undefined : [idAt(y), idAt(o)])
				}
				label={(i) => periodLabel(idAt(i))}
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
