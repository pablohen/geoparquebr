import { Group, Select, Slider, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { m } from "~/paraglide/messages.js";
import { scoreLabel } from "../labels";
import { type FilterScoreKey, FilterScoreKeySchema } from "../schemas";

/** Where the slider starts when a criterion is first picked. */
const DEFAULT_MIN = 200;

type Value = { sk?: FilterScoreKey; sm?: number };

type Props = {
	value: Value;
	onChange: (next: Value) => void;
};

/** A GEOSSIT score and the least it may be; no criterion means no filter. */
export function MinScoreFilter({ value, onChange }: Props) {
	// Dragging updates the label live; the URL (and the query) on release.
	const [min, setMin] = useState(value.sm ?? DEFAULT_MIN);
	useEffect(() => setMin(value.sm ?? DEFAULT_MIN), [value.sm]);

	return (
		<Stack gap={6}>
			<Group justify="space-between" gap="xs" wrap="nowrap" align="flex-end">
				<Select
					size="xs"
					label={m.filters_min_score()}
					placeholder={m.filters_min_score_any()}
					data={FilterScoreKeySchema.options.map((k) => ({
						value: k,
						label: scoreLabel(k),
					}))}
					value={value.sk ?? null}
					onChange={(next) => {
						const sk = FilterScoreKeySchema.safeParse(next);
						onChange(
							sk.success
								? { sk: sk.data, sm: value.sm ?? DEFAULT_MIN }
								: { sk: undefined, sm: undefined },
						);
					}}
					clearable
					style={{ flex: 1 }}
				/>
				{value.sk && (
					<Text size="xs" c="dimmed" mb={6} style={{ whiteSpace: "nowrap" }}>
						{m.filters_min_score_value({ value: min })}
					</Text>
				)}
			</Group>
			{value.sk && (
				<Slider
					size="sm"
					min={25}
					max={400}
					step={25}
					value={min}
					onChange={setMin}
					onChangeEnd={(sm) => onChange({ sk: value.sk, sm })}
					label={null}
					thumbLabel={m.filters_min_score_slider()}
				/>
			)}
		</Stack>
	);
}
