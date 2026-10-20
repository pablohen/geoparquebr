import { Box, Center, ColorSwatch, Group, Stack, Text } from "@mantine/core";
import {
	Bounds,
	ContactShadows,
	OrbitControls,
	useGLTF,
} from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, type ReactNode, Suspense } from "react";
import type { GltfModel3D } from "../schemas";

/** One band of the stratigraphic column, listed top → bottom. */
export type StrataLayer = {
	/** Stable key, e.g. the map unit code. */
	id: string;
	name: string;
	/** Secondary legend text, e.g. "101–145 Ma". */
	detail?: string;
	color: string;
	thickness: number;
};

type Props = {
	model?: GltfModel3D;
	/** Column to draw when there's no model; defaults to an illustrative one. */
	strata?: StrataLayer[];
};

/**
 * Interactive viewer for fossil/strata/cave scans. Without a model it draws a
 * stratigraphic column: real mapped units when given, else an illustrative one.
 * Default export so it can be `React.lazy`-loaded client-side only.
 *
 * Overlays (legend, errors) are plain DOM outside the Canvas: drei's <Html>
 * mounts a React root per element, which React 19 warns about on unmount.
 */
export default function ModelViewer({
	model,
	strata = ILLUSTRATIVE_STRATA,
}: Props) {
	return (
		<Box pos="relative" h="100%">
			<ModelErrorBoundary
				fallback={
					<Center h="100%">
						<Text size="sm" c="dimmed">
							Falha ao carregar o modelo 3D.
						</Text>
					</Center>
				}
			>
				<Canvas camera={{ position: [4, 3, 5], fov: 45 }} dpr={[1, 2]} shadows>
					<color attach="background" args={["#1a1b1e"]} />
					<hemisphereLight args={["#fff5e6", "#2b2b2b", 0.8]} />
					<directionalLight position={[5, 8, 4]} intensity={1.6} castShadow />

					<Suspense fallback={null}>
						<Bounds fit clip observe margin={1.4}>
							{model ? (
								<GltfModel model={model} />
							) : (
								<ProceduralStrata layers={strata} />
							)}
						</Bounds>
					</Suspense>

					<ContactShadows
						position={[0, -1.6, 0]}
						opacity={0.5}
						blur={2.5}
						far={4}
					/>
					<OrbitControls makeDefault enableDamping />
				</Canvas>
			</ModelErrorBoundary>

			{!model && <StrataLegend layers={strata} />}
		</Box>
	);
}

function GltfModel({ model }: { model: GltfModel3D }) {
	const { scene } = useGLTF(model.url);
	// Many photogrammetry exports are Z-up; three.js is Y-up.
	return (
		<primitive
			object={scene}
			rotation={model.upAxis === "z" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
		/>
	);
}

/** Illustrative layers (top → bottom), loosely modelled on the Araripe basin. */
const ILLUSTRATIVE_STRATA: StrataLayer[] = [
	{
		id: "exu",
		name: "Fm. Exu — arenito",
		color: "#c9814f",
		thickness: 0.6,
	},
	{
		id: "romualdo",
		name: "Fm. Romualdo — folhelho c/ concreções",
		color: "#7d7466",
		thickness: 0.45,
	},
	{
		id: "ipubi",
		name: "Fm. Ipubi — gipsita",
		color: "#e8e1d3",
		thickness: 0.25,
	},
	{
		id: "crato",
		name: "Fm. Crato — calcário laminado",
		color: "#d8c39a",
		thickness: 0.5,
	},
	{
		id: "barbalha",
		name: "Fm. Barbalha — arenito/argilito",
		color: "#a65a3a",
		thickness: 0.55,
	},
	{
		id: "embasamento",
		name: "Embasamento cristalino",
		color: "#4a4a52",
		thickness: 0.6,
	},
];

function ProceduralStrata({ layers }: { layers: StrataLayer[] }) {
	const total = layers.reduce((sum, l) => sum + l.thickness, 0);
	let top = total / 2;

	return (
		<group>
			{layers.map((layer, i) => {
				const y = top - layer.thickness / 2;
				top -= layer.thickness;
				// Slight offsets give the block an eroded-outcrop look.
				const inset = (i % 2) * 0.08;
				return (
					<mesh key={layer.id} position={[0, y, 0]} castShadow receiveShadow>
						<boxGeometry
							args={[3 - inset, layer.thickness * 0.98, 2 - inset]}
						/>
						<meshStandardMaterial color={layer.color} roughness={0.9} />
					</mesh>
				);
			})}
		</group>
	);
}

function StrataLegend({ layers }: { layers: StrataLayer[] }) {
	return (
		<Stack
			gap={4}
			pos="absolute"
			left={12}
			bottom={12}
			p="xs"
			bg="rgba(0, 0, 0, 0.55)"
			style={{
				borderRadius: "var(--mantine-radius-sm)",
				pointerEvents: "none",
			}}
		>
			{layers.map((layer) => (
				<Group key={layer.id} gap={8} wrap="nowrap">
					<ColorSwatch color={layer.color} size={12} withShadow={false} />
					<Text size="xs" c="gray.3">
						{layer.name}
						{layer.detail && (
							<Text span size="xs" c="gray.5">
								{" "}
								· {layer.detail}
							</Text>
						)}
					</Text>
				</Group>
			))}
		</Stack>
	);
}

class ModelErrorBoundary extends Component<
	{ fallback: ReactNode; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}
