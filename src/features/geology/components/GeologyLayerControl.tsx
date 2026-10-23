import { Slider, Stack, Switch, Text } from "@mantine/core";
import { Stack as StackIcon } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";

type Props = {
	visible: boolean;
	opacity: number;
	onVisibleChange: (visible: boolean) => void;
	onOpacityChange: (opacity: number) => void;
};

/** SGB's lithostratigraphy layer, as a row of the "Camadas" menu. */
export function GeologyLayerControl({
	visible,
	opacity,
	onVisibleChange,
	onOpacityChange,
}: Props) {
	return (
		<Stack gap={6}>
			<Switch
				size="sm"
				label={m.geology_layer()}
				thumbIcon={<StackIcon size={10} />}
				checked={visible}
				onChange={(e) => onVisibleChange(e.currentTarget.checked)}
			/>
			{visible && (
				<>
					<Slider
						size="xs"
						min={0.2}
						max={1}
						step={0.05}
						value={opacity}
						onChange={onOpacityChange}
						label={(v) => `${Math.round(v * 100)}%`}
						thumbLabel={m.geology_opacity()}
					/>
					<Text size="xs" c="dimmed">
						{m.geology_identify_hint()}
					</Text>
				</>
			)}
		</Stack>
	);
}
