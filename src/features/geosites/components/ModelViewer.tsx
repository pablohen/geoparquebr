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

type Props = { model?: GltfModel3D };

/**
 * Interactive viewer for fossil/strata/cave scans. Falls back to a procedural
 * stratigraphic column when a geosite has no digitised model yet.
 * Default export so it can be `React.lazy`-loaded client-side only.
 *
 * Overlays (legend, errors) are plain DOM outside the Canvas: drei's <Html>
 * mounts a React root per element, which React 19 warns about on unmount.
 */
export default function ModelViewer({ model }: Props) {
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
							{model ? <GltfModel model={model} /> : <ProceduralStrata />}
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

			{!model && <StrataLegend />}
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
const STRATA = [
	{ name: "Fm. Exu — arenito", color: "#c9814f", thickness: 0.6 },
	{
		name: "Fm. Romualdo — folhelho c/ concreções",
		color: "#7d7466",
		thickness: 0.45,
	},
	{ name: "Fm. Ipubi — gipsita", color: "#e8e1d3", thickness: 0.25 },
	{ name: "Fm. Crato — calcário laminado", color: "#d8c39a", thickness: 0.5 },
	{
		name: "Fm. Barbalha — arenito/argilito",
		color: "#a65a3a",
		thickness: 0.55,
	},
	{ name: "Embasamento cristalino", color: "#4a4a52", thickness: 0.6 },
] as const;

function ProceduralStrata() {
	const total = STRATA.reduce((sum, l) => sum + l.thickness, 0);
	let top = total / 2;

	return (
		<group>
			{STRATA.map((layer, i) => {
				const y = top - layer.thickness / 2;
				top -= layer.thickness;
				// Slight offsets give the block an eroded-outcrop look.
				const inset = (i % 2) * 0.08;
				return (
					<mesh key={layer.name} position={[0, y, 0]} castShadow receiveShadow>
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

function StrataLegend() {
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
			{STRATA.map((layer) => (
				<Group key={layer.name} gap={8} wrap="nowrap">
					<ColorSwatch color={layer.color} size={12} withShadow={false} />
					<Text size="xs" c="gray.3">
						{layer.name}
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
