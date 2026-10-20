import {
	Anchor,
	Badge,
	Box,
	Center,
	Drawer,
	Group,
	Loader,
	SegmentedControl,
	Stack,
	Table,
	Tabs,
	Text,
	Title,
} from "@mantine/core";
import { Cube, Info } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useState } from "react";
import {
	GEOPARK_LABELS,
	GEOSITE_CATEGORY_LABELS,
	type Geosite,
	type GeositeWithDistance,
	type Model3D,
	SCIENTIFIC_VALUE_LABELS,
} from "../schemas";
import { CATEGORY_COLORS, formatDistance } from "./categoryStyle";

// three.js + R3F (~600 kB) only load when someone opens the 3D tab.
const ModelViewer = lazy(() => import("./ModelViewer"));

type Props = {
	geosite: GeositeWithDistance | null;
	onClose: () => void;
};

export function GeositeDrawer({ geosite, onClose }: Props) {
	return (
		<Drawer
			opened={geosite !== null}
			onClose={onClose}
			position="right"
			size="xl"
			title={
				geosite && (
					<Stack gap={2}>
						<Title order={2} size="h3">
							{geosite.name}
						</Title>
						<Text size="sm" c="dimmed">
							{GEOPARK_LABELS[geosite.geoparkId]}
						</Text>
					</Stack>
				)
			}
		>
			{/* `key` resets tab/model state when switching between geosites. */}
			{geosite && <GeositeDetail key={geosite.id} geosite={geosite} />}
		</Drawer>
	);
}

function GeositeDetail({ geosite }: { geosite: GeositeWithDistance }) {
	const [tab, setTab] = useState<string | null>("overview");

	return (
		<Tabs value={tab} onChange={setTab} keepMounted={false}>
			<Tabs.List mb="md">
				<Tabs.Tab value="overview" leftSection={<Info size={16} />}>
					Visão geral
				</Tabs.Tab>
				<Tabs.Tab value="model" leftSection={<Cube size={16} />}>
					Modelo 3D {geosite.models.length > 0 && `(${geosite.models.length})`}
				</Tabs.Tab>
			</Tabs.List>

			<Tabs.Panel value="overview">
				<Overview geosite={geosite} />
			</Tabs.Panel>
			<Tabs.Panel value="model">
				<ModelsPanel models={geosite.models} />
			</Tabs.Panel>
		</Tabs>
	);
}

function Overview({ geosite }: { geosite: GeositeWithDistance }) {
	const [lng, lat] = geosite.location.coordinates;
	return (
		<Stack>
			<Group gap={6}>
				{geosite.categories.map((c) => (
					<Badge key={c} variant="light" color={CATEGORY_COLORS[c]}>
						{GEOSITE_CATEGORY_LABELS[c]}
					</Badge>
				))}
			</Group>
			<Text>{geosite.summary}</Text>
			{geosite.description && (
				<Text size="sm" c="dimmed">
					{geosite.description}
				</Text>
			)}
			<Table variant="vertical" layout="fixed" withTableBorder>
				<Table.Tbody>
					<Row label="Município">
						{geosite.municipality} – {geosite.state}
					</Row>
					<Row label="Relevância científica">
						{SCIENTIFIC_VALUE_LABELS[geosite.scientificValue]}
					</Row>
					{geosite.geologicAge && (
						<Row label="Idade geológica">{formatAge(geosite.geologicAge)}</Row>
					)}
					<Row label="Distância">{formatDistance(geosite.distanceMeters)}</Row>
					<Row label="Coordenadas">
						{lat.toFixed(4)}, {lng.toFixed(4)}
						{geosite.locationIsSensitive && (
							<Text span size="xs" c="dimmed">
								{" "}
								(aproximadas — sítio protegido)
							</Text>
						)}
					</Row>
				</Table.Tbody>
			</Table>
		</Stack>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<Table.Tr>
			<Table.Th w={180}>{label}</Table.Th>
			<Table.Td>{children}</Table.Td>
		</Table.Tr>
	);
}

function formatAge(age: NonNullable<Geosite["geologicAge"]>): string {
	const range =
		age.minMa !== undefined && age.maxMa !== undefined
			? ` · ${age.minMa}–${age.maxMa} Ma`
			: "";
	return [age.period, age.formation].filter(Boolean).join(" — ") + range;
}

function ModelsPanel({ models }: { models: Model3D[] }) {
	const [index, setIndex] = useState("0");
	const model = models[Number(index)];

	return (
		<Stack>
			{models.length > 1 && (
				<SegmentedControl
					value={index}
					onChange={setIndex}
					data={models.map((m, i) => ({ value: String(i), label: m.title }))}
				/>
			)}
			<Box
				h={440}
				bg="dark.8"
				style={{ borderRadius: "var(--mantine-radius-md)", overflow: "hidden" }}
			>
				<ClientOnly fallback={<ViewerFallback />}>
					<Suspense fallback={<ViewerFallback />}>
						<ModelViewer model={model} />
					</Suspense>
				</ClientOnly>
			</Box>
			{model ? (
				<Text size="xs" c="dimmed">
					{model.attribution} · {model.license}
					{model.realWorldSizeM && ` · ${model.realWorldSizeM} m`}{" "}
					<Anchor href={model.url} size="xs" target="_blank" rel="noreferrer">
						{model.format.toUpperCase()}
					</Anchor>
				</Text>
			) : (
				<Text size="xs" c="dimmed">
					Ainda não há modelo digitalizado para este geossítio — exibindo uma
					coluna estratigráfica ilustrativa.
				</Text>
			)}
		</Stack>
	);
}

function ViewerFallback() {
	return (
		<Center h="100%">
			<Loader color="gray" />
		</Center>
	);
}
