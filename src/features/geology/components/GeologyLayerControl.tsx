import { Paper, Slider, Stack, Switch, Text } from "@mantine/core";
import { Stack as StackIcon } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";

type Props = {
	visible: boolean;
	opacity: number;
	onVisibleChange: (visible: boolean) => void;
	onOpacityChange: (opacity: number) => void;
};

/** Map overlay toggling SGB's lithostratigraphy layer. */
export function GeologyLayerControl({
	visible,
	opacity,
	onVisibleChange,
	onOpacityChange,
}: Props) {
	return (
		<Paper
			p={{ base: 6, sm: "xs" }}
			radius="md"
			shadow="sm"
			// A compact chip on phones; a full panel from `sm` up.
			w={visible ? { base: 180, sm: 230 } : { base: "auto", sm: 230 }}
		>
			<Stack gap={6}>
				<Switch
					size="sm"
					aria-label={m.geology_layer()}
					thumbIcon={<StackIcon size={10} />}
					label={
						<>
							<Text span hiddenFrom="sm" size="sm">
								{m.geology_layer_short()}
							</Text>
							<Text span visibleFrom="sm" size="sm">
								{m.geology_layer()}
							</Text>
						</>
					}
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
							aria-label={m.geology_opacity()}
						/>
						<Text size="xs" c="dimmed">
							{m.geology_identify_hint()}
						</Text>
					</>
				)}
			</Stack>
		</Paper>
	);
}
