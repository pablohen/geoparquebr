import { Paper, Slider, Stack, Switch, Text } from "@mantine/core";

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
			pos="absolute"
			top={12}
			left={12}
			p="xs"
			radius="md"
			shadow="sm"
			w={230}
			style={{ zIndex: 2 }}
		>
			<Stack gap={6}>
				<Switch
					size="sm"
					label="Mapa geológico (SGB, 1:1M)"
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
							aria-label="Opacidade do mapa geológico"
						/>
						<Text size="xs" c="dimmed">
							Clique no mapa para identificar a unidade.
						</Text>
					</>
				)}
			</Stack>
		</Paper>
	);
}
