import {
	Box,
	Checkbox,
	Group,
	Image,
	Paper,
	Popover,
	Stack,
	Text,
	UnstyledButton,
} from "@mantine/core";
import { StackSimple } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import {
	DENSITY_STOPS,
	MINERALS_SERVICE,
	OVERLAY_IDS,
	type Overlay,
	PROTECTED_INTEGRAL_COLOR,
	PROTECTED_SUSTAINABLE_COLOR,
} from "../overlays";

type Props = {
	on: Overlay[];
	onChange: (next: Overlay[] | undefined) => void;
	/** Base map rows ("Mapa"): geology, 3D relief. */
	map: ReactNode;
	/** Pin rows ("Pinos"): colours by age, the trip. */
	pins: ReactNode;
	/** How many of the `map` and `pins` settings are on, for the button's count. */
	activeSettings: number;
};

const LABEL: Record<Overlay, () => string> = {
	fossils: m.overlay_fossils,
	contours: m.overlay_contours,
	outlines: m.overlay_outlines,
	minerals: m.overlay_minerals,
	protected: m.overlay_protected,
};
const HINT: Record<Overlay, () => string> = {
	fossils: m.overlay_fossils_hint,
	contours: m.overlay_contours_hint,
	outlines: m.overlay_outlines_hint,
	minerals: m.overlay_minerals_hint,
	protected: m.overlay_protected_hint,
};

/**
 * "Camadas": everything drawn on the map, in one menu so the map stays
 * clear: the base map, how pins look, and optional overlays (each with what
 * it shows and its legend). The button counts what's on.
 */
export function OverlaysControl({
	on,
	onChange,
	map,
	pins,
	activeSettings,
}: Props) {
	const active = on.length + activeSettings;
	const toggle = (overlay: Overlay, checked: boolean) => {
		const next = OVERLAY_IDS.filter((id) =>
			id === overlay ? checked : on.includes(id),
		);
		onChange(next.length > 0 ? next : undefined);
	};
	return (
		<Popover
			position="bottom-start"
			// Fits a 375 px phone with the 10 px map margin on each side.
			width="min(280px, calc(100vw - 20px))"
			shadow="md"
			withinPortal
		>
			<Popover.Target>
				<Paper
					p={{ base: 6, sm: "xs" }}
					radius="md"
					shadow="sm"
					renderRoot={(props) => <UnstyledButton {...props} />}
				>
					<Group gap={8} wrap="nowrap">
						<StackSimple size={18} weight="duotone" aria-hidden />
						<Text size="sm">{m.overlays_title()}</Text>
						{active > 0 && (
							<Text size="xs" c="dimmed">
								({active})
							</Text>
						)}
					</Group>
				</Paper>
			</Popover.Target>
			<Popover.Dropdown
				// Scrolls inside a short phone screen instead of running off it.
				mah="calc(100dvh - 140px)"
				style={{ overflowY: "auto" }}
			>
				<Stack gap="md">
					<MenuSection title={m.overlays_section_map()}>{map}</MenuSection>
					<MenuSection title={m.overlays_section_pins()}>{pins}</MenuSection>
					<MenuSection title={m.overlays_section_overlays()}>
						{OVERLAY_IDS.map((id) => (
							<Stack key={id} gap={4}>
								<Checkbox
									size="sm"
									label={LABEL[id]()}
									checked={on.includes(id)}
									onChange={(e) => toggle(id, e.currentTarget.checked)}
								/>
								{on.includes(id) && (
									<Box pl={30}>
										<Text size="xs" c="dimmed">
											{HINT[id]()}
										</Text>
										{id === "fossils" && <DensityLegend />}
										{id === "minerals" && <MineralsLegend />}
										{id === "protected" && <ProtectedLegend />}
									</Box>
								)}
							</Stack>
						))}
					</MenuSection>
				</Stack>
			</Popover.Dropdown>
		</Popover>
	);
}

function MenuSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<Stack gap="sm" component="section" aria-label={title}>
			<Text size="xs" fw={700} c="dimmed" tt="uppercase">
				{title}
			</Text>
			{children}
		</Stack>
	);
}

function ProtectedLegend() {
	const items = [
		[PROTECTED_INTEGRAL_COLOR, m.overlay_protected_integral()],
		[PROTECTED_SUSTAINABLE_COLOR, m.overlay_protected_sustainable()],
	] as const;
	return (
		<Stack gap={2} mt={4} component="ul" m={0} p={0}>
			{items.map(([color, label]) => (
				<Group
					key={label}
					gap={6}
					wrap="nowrap"
					component="li"
					style={{ listStyle: "none" }}
				>
					<Box
						aria-hidden
						w={12}
						h={12}
						style={{
							border: `2px solid ${color}`,
							background: `color-mix(in srgb, ${color} 25%, transparent)`,
							borderRadius: 2,
						}}
					/>
					<Text size="xs">{label}</Text>
				</Group>
			))}
		</Stack>
	);
}

function DensityLegend() {
	return (
		<Stack gap={2} mt={4}>
			<Box
				aria-hidden
				h={8}
				style={{
					borderRadius: 4,
					background: `linear-gradient(to right, ${DENSITY_STOPS.map(([, c]) => c).join(", ")})`,
				}}
			/>
			<Text size="xs">{m.overlay_density_legend()}</Text>
		</Stack>
	);
}

type SgbLegend = {
	layers: {
		legend: { label: string; imageData: string; contentType: string }[];
	}[];
};

/** SGB's own legend (substance classes), fetched only while the layer is on. */
function MineralsLegend() {
	const legend = useServerQuery("sgb-minerals-legend", async () => {
		const res = await fetch(`${MINERALS_SERVICE}/legend?f=json`);
		if (!res.ok) throw new Error(String(res.status));
		return (await res.json()) as SgbLegend;
	});
	const items = legend.data?.layers[0]?.legend ?? [];
	if (items.length === 0) return null;
	return (
		<Stack gap={2} mt={4} component="ul" m={0} p={0}>
			{items.map((item) => (
				<Group
					key={item.label}
					gap={6}
					wrap="nowrap"
					component="li"
					style={{ listStyle: "none" }}
				>
					<Image
						src={`data:${item.contentType};base64,${item.imageData}`}
						alt=""
						w={14}
						h={14}
					/>
					<Text size="xs">{item.label}</Text>
				</Group>
			))}
		</Stack>
	);
}
