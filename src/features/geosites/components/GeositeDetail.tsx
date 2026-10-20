import {
	Anchor,
	Badge,
	Box,
	Center,
	Group,
	Image,
	Loader,
	Progress,
	Select,
	SimpleGrid,
	Spoiler,
	Stack,
	Table,
	Tabs,
	Text,
} from "@mantine/core";
import { ArrowSquareOut, Bone, Cube, Info } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useState } from "react";
import { FossilsPanel } from "~/features/geology/components/FossilsPanel";
import { getGeositeStrata } from "~/features/geology/geology.functions";
import type { StrataUnit } from "~/features/geology/schemas";
import {
	formatAgeRange,
	icsColorForAge,
	midAge,
	shade,
} from "~/features/geology/time-scale";
import { useIsMobile } from "~/lib/use-is-mobile";
import { useServerQuery } from "~/lib/use-server-query";
import {
	DEGRADATION_RISK_LABELS,
	type DrawerTab,
	DrawerTabSchema,
	GEOPARK_LABELS,
	GEOSITE_CATEGORY_LABELS,
	type Geosite,
	type GeositeScores,
	type Model3D,
	type ModelProvenance,
	RELEVANCE_LABELS,
} from "../schemas";
import { CATEGORY_COLORS } from "./categoryStyle";
import type { StrataLayer } from "./ModelViewer";
import { SketchfabEmbed } from "./SketchfabEmbed";

// three.js + R3F (~600 kB) only load when a self-hosted model or the strata fallback is shown.
const ModelViewer = lazy(() => import("./ModelViewer"));

/** Tab/model selection, owned by the route's search params so it survives reloads and links. */
export type GeositeView = { tab?: DrawerTab; model?: number };

function ShortLabel({ short, full }: { short: string; full: string }) {
	return (
		<>
			<Text span inherit hiddenFrom="sm">
				{short}
			</Text>
			<Text span inherit visibleFrom="sm">
				{full}
			</Text>
		</>
	);
}

export function geoparkLabel(g: Geosite): string {
	if (g.geoparkId) return GEOPARK_LABELS[g.geoparkId];
	if (g.geoparkProposal) return `Proposta de geoparque: ${g.geoparkProposal}`;
	return "Fora dos geoparques mundiais da UNESCO";
}

/** Tabs (overview, 3D, fossils) for one geosite; shared by the drawer and the geosite page. */
export function GeositeDetail({
	geosite,
	view,
	onViewChange,
}: {
	geosite: Geosite;
	view: GeositeView;
	onViewChange: (next: GeositeView) => void;
}) {
	const isMobile = useIsMobile();
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
			{/* Tabs share the width on phones, with shorter labels so all three fit. */}
			<Tabs.List mb="md" grow={isMobile}>
				<Tabs.Tab value="overview" leftSection={<Info size={16} />}>
					<ShortLabel short="Geral" full="Visão geral" />
				</Tabs.Tab>
				<Tabs.Tab value="model" leftSection={<Cube size={16} />}>
					<ShortLabel short="3D" full="Modelo 3D" />
					{geosite.models.length > 0 && ` (${geosite.models.length})`}
				</Tabs.Tab>
				<Tabs.Tab value="fossils" leftSection={<Bone size={16} />}>
					Fósseis
				</Tabs.Tab>
			</Tabs.List>

			<Tabs.Panel value="overview">
				<Overview geosite={geosite} />
			</Tabs.Panel>
			<Tabs.Panel value="model">
				<ModelsPanel
					slug={geosite.slug}
					models={geosite.models}
					index={view.model ?? 0}
					onIndexChange={(i) =>
						onViewChange({ model: i === 0 ? undefined : i })
					}
				/>
			</Tabs.Panel>
			<Tabs.Panel value="fossils">
				<FossilsPanel slug={geosite.slug} />
			</Tabs.Panel>
		</Tabs>
	);
}

function Overview({ geosite }: { geosite: Geosite }) {
	const [lng, lat] = geosite.location.coordinates;
	return (
		<Stack>
			{geosite.coverImageUrl && (
				<CoverImage
					key={geosite.coverImageUrl}
					src={geosite.coverImageUrl}
					alt={geosite.name}
				/>
			)}
			{geosite.categories.length > 0 && (
				<Group gap={6}>
					{geosite.categories.map((c) => (
						<Badge key={c} variant="light" color={CATEGORY_COLORS[c]}>
							{GEOSITE_CATEGORY_LABELS[c]}
						</Badge>
					))}
				</Group>
			)}
			<Spoiler maxHeight={120} showLabel="Ler mais" hideLabel="Mostrar menos">
				<Text style={{ whiteSpace: "pre-line" }}>
					{geosite.description ?? geosite.summary}
				</Text>
			</Spoiler>

			<Table variant="vertical" layout="fixed" withTableBorder>
				<Table.Tbody>
					<Row label="Município">
						{geosite.municipality} – {geosite.state}
					</Row>
					<Row label="Relevância">{RELEVANCE_LABELS[geosite.relevance]}</Row>
					{geosite.degradationRisk && (
						<Row label="Risco de degradação">
							{DEGRADATION_RISK_LABELS[geosite.degradationRisk]}
						</Row>
					)}
					{geosite.geology && (
						<Row label="Contexto geológico">
							{[geosite.geology.province, geosite.geology.setting]
								.filter(Boolean)
								.join(" · ")}
						</Row>
					)}
					{geosite.geologicAge && (
						<Row label="Idade geológica">{formatAge(geosite.geologicAge)}</Row>
					)}
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

			{geosite.scores && <Scores scores={geosite.scores} />}
			{geosite.source && <SourceCredit source={geosite.source} />}
		</Stack>
	);
}

/** ~2% of GEOSSIT photo links 404; hide those instead of showing a broken image. */
function CoverImage({ src, alt }: { src: string; alt: string }) {
	const [failed, setFailed] = useState(false);
	if (failed) return null;
	return (
		<Image
			src={src}
			alt={alt}
			h={220}
			radius="md"
			fit="cover"
			loading="lazy"
			// Image's own `flex: 0` lets a flex column's min-height:auto override `h`.
			style={{ flex: "none" }}
			onError={() => setFailed(true)}
		/>
	);
}

const SCORE_LABELS = {
	scientific: "Valor científico",
	tourism: "Potencial turístico",
	didactic: "Potencial didático",
	vulnerability: "Vulnerabilidade",
} as const satisfies Record<keyof GeositeScores, string>;

function Scores({ scores }: { scores: GeositeScores }) {
	return (
		<Stack gap={6}>
			<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
				Avaliação quantitativa (0–400)
			</Text>
			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs">
				{(Object.keys(SCORE_LABELS) as (keyof GeositeScores)[]).map((key) => (
					<div key={key}>
						<Group justify="space-between" mb={2}>
							<Text size="sm">{SCORE_LABELS[key]}</Text>
							<Text size="sm" ff="monospace">
								{scores[key]}
							</Text>
						</Group>
						<Progress
							value={(scores[key] / 400) * 100}
							color={key === "vulnerability" ? "red" : undefined}
							size="sm"
							aria-label={`${SCORE_LABELS[key]}: ${scores[key]} de 400`}
						/>
					</div>
				))}
			</SimpleGrid>
		</Stack>
	);
}

function SourceCredit({ source }: { source: NonNullable<Geosite["source"]> }) {
	return (
		<Stack gap={4}>
			<Text size="xs" c="dimmed">
				Fonte: GEOSSIT — Serviço Geológico do Brasil (SGB/CPRM).{" "}
				<Anchor href={source.url} target="_blank" rel="noreferrer" size="xs">
					Ver ficha no GEOSSIT <ArrowSquareOut size={12} />
				</Anchor>
			</Text>
			{source.authors && (
				<Text size="xs" c="dimmed" lineClamp={2}>
					Autores: {source.authors}
				</Text>
			)}
		</Stack>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<Table.Tr>
			<Table.Th w="38%" maw={180}>
				{label}
			</Table.Th>
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

const PROVENANCE_NOTES = {
	locality: "Coletado/digitalizado neste geossítio.",
	region:
		"Exemplar da mesma bacia/região — local exato de coleta não informado.",
	illustrative: "Exemplo ilustrativo — não provém deste geossítio.",
} as const satisfies Record<ModelProvenance, string>;

const STRATA_OPTION = "strata";

function ModelsPanel({
	slug,
	models,
	index: requested,
	onIndexChange,
}: {
	slug: string;
	models: Model3D[];
	index: number;
	onIndexChange: (index: number) => void;
}) {
	// The mapped strata column is always offered, after any scanned models.
	// A stale/hand-edited ?model= past the end falls back to the first entry.
	const index = requested <= models.length ? requested : 0;
	const model = models[index];

	return (
		<Stack>
			{models.length > 0 && (
				<Select
					label="Modelo"
					value={model ? String(index) : STRATA_OPTION}
					onChange={(v) =>
						v !== null &&
						onIndexChange(v === STRATA_OPTION ? models.length : Number(v))
					}
					data={[
						...models.map((m, i) => ({ value: String(i), label: m.title })),
						{
							value: STRATA_OPTION,
							label: "Coluna estratigráfica (mapa do SGB)",
						},
					]}
					allowDeselect={false}
				/>
			)}
			{model ? <ModelView model={model} /> : <StrataView slug={slug} />}
		</Stack>
	);
}

const viewerBox = {
	h: { base: 320, sm: 440 },
	bg: "dark.8",
	style: { borderRadius: "var(--mantine-radius-md)", overflow: "hidden" },
} as const;

function ModelView({ model }: { model: Model3D }) {
	return (
		<>
			<Box {...viewerBox}>
				{model.provider === "sketchfab" ? (
					<SketchfabEmbed key={model.uid} uid={model.uid} title={model.title} />
				) : (
					<ClientOnly fallback={<ViewerFallback />}>
						<Suspense fallback={<ViewerFallback />}>
							<ModelViewer model={model} />
						</Suspense>
					</ClientOnly>
				)}
			</Box>
			<Stack gap={2}>
				<Text size="sm" fw={600}>
					{model.title}
				</Text>
				<Text size="xs" c="dimmed">
					{PROVENANCE_NOTES[model.provenance]}
				</Text>
				<Text size="xs" c="dimmed">
					{model.attribution} · {model.license}
					{model.realWorldSizeM && ` · ${model.realWorldSizeM} m`}
					{model.sourceUrl && (
						<>
							{" · "}
							<Anchor
								href={model.sourceUrl}
								target="_blank"
								rel="noreferrer"
								size="xs"
							>
								Fonte <ArrowSquareOut size={12} />
							</Anchor>
						</>
					)}
				</Text>
			</Stack>
		</>
	);
}

/** Mapped units → column bands; same-period neighbours get alternating shades. */
function toLayers(units: StrataUnit[]): StrataLayer[] {
	let previous = "";
	return units.map((u, i) => {
		const base = icsColorForAge(midAge(u.minMa, u.maxMa));
		const color = base === previous ? shade(base, 0.18 * (i % 2 || 1)) : base;
		previous = base;
		return {
			id: u.code,
			name: u.name,
			detail: [formatAgeRange(u.minMa, u.maxMa), u.period]
				.filter(Boolean)
				.join(" · "),
			color,
			thickness: 0.5,
		};
	});
}

function StrataView({ slug }: { slug: string }) {
	const strata = useServerQuery(`strata:${slug}`, () =>
		getGeositeStrata({ data: { slug } }),
	);
	const data = strata.data;
	const mapped =
		data?.status === "ok" && data.units.length > 0 ? data : undefined;

	return (
		<>
			<Box {...viewerBox}>
				{strata.status === "pending" ? (
					<ViewerFallback />
				) : (
					<ClientOnly fallback={<ViewerFallback />}>
						<Suspense fallback={<ViewerFallback />}>
							<ModelViewer
								strata={mapped ? toLayers(mapped.units) : undefined}
							/>
						</Suspense>
					</ClientOnly>
				)}
			</Box>
			{strata.status === "pending" ? null : mapped ? (
				<Stack gap={4}>
					<Text size="sm" fw={600}>
						Unidades litoestratigráficas num raio de ~{mapped.radiusKm} km
					</Text>
					<Text size="xs" c="dimmed">
						Mapa geológico do SGB/CPRM, escala 1:
						{mapped.scale.toLocaleString("pt-BR")}. Da mais recente (topo) à
						mais antiga (base); cores da carta cronoestratigráfica
						internacional. Espessuras ilustrativas — o mapa não informa
						espessuras.
					</Text>
					{mapped.units.map((u) => (
						<Text key={u.code} size="xs">
							<Text span fw={600} ff="monospace">
								{u.code}
							</Text>{" "}
							{u.name}
							{u.lithology && (
								<Text span c="dimmed">
									{" "}
									— {u.lithology}
								</Text>
							)}
						</Text>
					))}
				</Stack>
			) : (
				<Text size="xs" c="dimmed">
					{data?.status === "unavailable" || strata.status === "error"
						? "Mapa geológico do SGB indisponível no momento — "
						: "Nenhuma unidade mapeada encontrada — "}
					exibindo uma coluna estratigráfica ilustrativa (Bacia do Araripe).
				</Text>
			)}
		</>
	);
}

function ViewerFallback() {
	return (
		<Center h="100%">
			<Loader color="gray" />
		</Center>
	);
}
