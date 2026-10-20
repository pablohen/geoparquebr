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
import { lazy, type ReactNode, Suspense } from "react";
import {
	type DrawerTab,
	DrawerTabSchema,
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

/** Drawer UI state, owned by the route's search params so it survives reloads and links. */
type DrawerView = { tab?: DrawerTab; model?: number };

type Props = {
	geosite: GeositeWithDistance | null;
	view: DrawerView;
	onViewChange: (next: DrawerView) => void;
	onClose: () => void;
};

export function GeositeDrawer({ geosite, view, onViewChange, onClose }: Props) {
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
			{geosite && (
				<GeositeDetail
					geosite={geosite}
					view={view}
					onViewChange={onViewChange}
				/>
			)}
		</Drawer>
	);
}

function GeositeDetail({
	geosite,
	view,
	onViewChange,
}: {
	geosite: GeositeWithDistance;
	view: DrawerView;
	onViewChange: (next: DrawerView) => void;
}) {
	const tab = view.tab ?? "overview";
	// Default values are omitted from the URL to keep links short.
	const setTab = (value: string | null) => {
		const parsed = DrawerTabSchema.safeParse(value);
		if (parsed.success)
			onViewChange({
				tab: parsed.data === "overview" ? undefined : parsed.data,
			});
	};

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
				<ModelsPanel
					models={geosite.models}
					index={view.model ?? 0}
					onIndexChange={(i) =>
						onViewChange({ model: i === 0 ? undefined : i })
					}
				/>
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

function ModelsPanel({
	models,
	index: requested,
	onIndexChange,
}: {
	models: Model3D[];
	index: number;
	onIndexChange: (index: number) => void;
}) {
	// A stale/hand-edited ?model= past the end falls back to the first model.
	const index = requested < models.length ? requested : 0;
	const model = models[index];

	return (
		<Stack>
			{models.length > 1 && (
				<SegmentedControl
					value={String(index)}
					onChange={(v) => onIndexChange(Number(v))}
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
