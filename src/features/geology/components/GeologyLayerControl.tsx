import { Paper, Slider, Stack, Switch, Text } from "@mantine/core";
import { Stack as StackIcon } from "@phosphor-icons/react";

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
			p={{ base: 6, sm: "xs" }}
			radius="md"
			shadow="sm"
			// A compact chip on phones; a full panel from `sm` up.
			w={visible ? { base: 180, sm: 230 } : { base: "auto", sm: 230 }}
			style={{ zIndex: 2 }}
		>
			<Stack gap={6}>
				<Switch
					size="sm"
					aria-label="Mapa geológico (SGB, 1:1M)"
					thumbIcon={<StackIcon size={10} />}
					label={
						<>
							<Text span hiddenFrom="sm" size="sm">
								Geologia
							</Text>
							<Text span visibleFrom="sm" size="sm">
								Mapa geológico (SGB, 1:1M)
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
							aria-label="Opacidade do mapa geológico"
						/>
						<Text size="xs" c="dimmed">
							Toque/clique no mapa para identificar a unidade.
						</Text>
					</>
				)}
			</Stack>
		</Paper>
	);
}
