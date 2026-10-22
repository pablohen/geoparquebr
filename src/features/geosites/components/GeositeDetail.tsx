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
import { ClientOnly, Link } from "@tanstack/react-router";
import {
	Fragment,
	lazy,
	type ReactNode,
	Suspense,
	useEffect,
	useRef,
	useState,
} from "react";
import { FossilsPanel } from "~/features/geology/components/FossilsPanel";
import { getGeositeStrata } from "~/features/geology/geology.functions";
import type { StrataUnit } from "~/features/geology/schemas";
import {
	formatAgeRange,
	icsColorForAge,
	midAge,
	shade,
} from "~/features/geology/time-scale";
import { scoreAnchor, themeAnchor } from "~/features/glossary/glossary";
import { StateLink } from "~/features/states/components/StateLink";
import { unitNames, unitSlug } from "~/features/units/units";
import { imageFailed } from "~/lib/image";
import { useIsMobile } from "~/lib/use-is-mobile";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { baseLocale, getLocale } from "~/paraglide/runtime.js";
import {
	categoryLabel,
	degradationRiskLabel,
	provenanceNote,
	relevanceLabel,
	SCORE_KEYS,
	scoreLabel,
} from "../labels";
import {
	type DrawerTab,
	DrawerTabSchema,
	type Geosite,
	type GeositeScores,
	type Model3D,
} from "../schemas";
import { CATEGORY_COLORS } from "./categoryStyle";
import type { StrataLayer } from "./ModelViewer";
import { NearbyGeosites } from "./NearbyGeosites";
import { SimilarGeosites } from "./SimilarGeosites";
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

/** Tabs (overview, 3D, fossils) for one geosite; shared by the drawer and the geosite page. */
export function GeositeDetail({
	geosite,
	view,
	onViewChange,
	onSelectGeosite,
	coverOk = true,
}: {
	geosite: Geosite;
	view: GeositeView;
	onViewChange: (next: GeositeView) => void;
	/** False when the server found the GEOSSIT photo unreachable: skip it. */
	coverOk?: boolean;
	/** Opens another geosite in place (the map drawer); else nearby ones link to their pages. */
	onSelectGeosite?: (slug: string) => void;
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
					<ShortLabel
						short={m.detail_tab_overview_short()}
						full={m.detail_tab_overview()}
					/>
				</Tabs.Tab>
				<Tabs.Tab value="model" leftSection={<Cube size={16} />}>
					<ShortLabel short="3D" full={m.detail_tab_model()} />
					{geosite.models.length > 0 && ` (${geosite.models.length})`}
				</Tabs.Tab>
				<Tabs.Tab value="fossils" leftSection={<Bone size={16} />}>
					{m.detail_tab_fossils()}
				</Tabs.Tab>
			</Tabs.List>

			<Tabs.Panel value="overview">
				<Overview
					geosite={geosite}
					onSelectGeosite={onSelectGeosite}
					coverOk={coverOk}
				/>
			</Tabs.Panel>
			<Tabs.Panel value="model">
				<ModelsPanel
					slug={geosite.slug}
					approximate={geosite.locationIsApproximate}
					models={geosite.models}
					index={view.model ?? 0}
					onIndexChange={(i) =>
						onViewChange({ model: i === 0 ? undefined : i })
					}
				/>
			</Tabs.Panel>
			<Tabs.Panel value="fossils">
				{geosite.locationIsApproximate ? (
					<NoLookups />
				) : (
					<FossilsPanel slug={geosite.slug} />
				)}
			</Tabs.Panel>
		</Tabs>
	);
}

function Overview({
	geosite,
	onSelectGeosite,
	coverOk,
}: {
	geosite: Geosite;
	onSelectGeosite?: (slug: string) => void;
	coverOk: boolean;
}) {
	const [lng, lat] = geosite.location.coordinates;
	return (
		<Stack>
			{coverOk && geosite.coverImageUrl && (
				<CoverImage
					key={geosite.coverImageUrl}
					src={geosite.coverImageUrl}
					alt={geosite.name}
				/>
			)}
			{geosite.categories.length > 0 && (
				<Group gap={6}>
					{geosite.categories.map((c) => (
						<Badge
							key={c}
							variant="light"
							color={CATEGORY_COLORS[c]}
							// Each theme opens its definition in the glossary.
							renderRoot={(props) => (
								<Link {...props} to="/glossary" hash={themeAnchor(c)} />
							)}
							style={{ cursor: "pointer" }}
						>
							{categoryLabel(c)}
						</Badge>
					))}
				</Group>
			)}
			<Stack gap={4}>
				<Spoiler
					maxHeight={120}
					showLabel={m.detail_read_more()}
					hideLabel={m.detail_show_less()}
				>
					<Text style={{ whiteSpace: "pre-line" }}>
						{geosite.description ?? geosite.summary}
					</Text>
				</Spoiler>
				{/* GEOSSIT records are Portuguese only; say so to other readers. */}
				{getLocale() !== baseLocale && (
					<Text size="xs" c="dimmed">
						{m.detail_description_language()}
					</Text>
				)}
			</Stack>

			<Table variant="vertical" layout="fixed" withTableBorder>
				<Table.Tbody>
					<Row label={m.detail_municipality()}>
						{geosite.municipality} –{" "}
						<StateLink uf={geosite.state} size="inherit" />
					</Row>
					<Row label={m.detail_relevance()}>
						{relevanceLabel(geosite.relevance)}
					</Row>
					{geosite.degradationRisk && (
						<Row label={m.detail_degradation_risk()}>
							{degradationRiskLabel(geosite.degradationRisk)}
						</Row>
					)}
					{geosite.geology && (
						<Row label={m.detail_geological_setting()}>
							{[geosite.geology.province, geosite.geology.setting]
								.filter(Boolean)
								.join(" · ")}
						</Row>
					)}
					{geosite.geologicAge && (
						<Row
							label={
								geosite.geologicAge.mapScale
									? m.detail_mapped_rock()
									: m.detail_geological_age()
							}
						>
							{formatGeologicAge(geosite.geologicAge)}
							{unitNames(geosite.geologicAge.formation).length > 0 && (
								<Text size="xs" mt={2}>
									{m.detail_unit_pages()}{" "}
									{unitNames(geosite.geologicAge.formation).map((name, i) => (
										<Fragment key={name}>
											{i > 0 && " · "}
											<Anchor
												size="xs"
												renderRoot={(props) => (
													<Link
														{...props}
														to="/units/$slug"
														params={{ slug: unitSlug(name) }}
													/>
												)}
											>
												{name}
											</Anchor>
										</Fragment>
									))}
								</Text>
							)}
							{geosite.geologicAge.mapScale && (
								<Text size="xs" c="dimmed" mt={2}>
									{m.detail_mapped_rock_note({
										scale: geosite.geologicAge.mapScale.toLocaleString(
											getLocale(),
										),
									})}
								</Text>
							)}
							{geosite.geologicAge.reference && (
								<Text size="xs" c="dimmed" mt={2}>
									{m.detail_age_reference()}{" "}
									<Anchor
										href={geosite.geologicAge.reference.url}
										target="_blank"
										rel="noreferrer"
										size="xs"
									>
										{geosite.geologicAge.reference.label}{" "}
										<ArrowSquareOut size={12} />
									</Anchor>
								</Text>
							)}
						</Row>
					)}
					<Row label={m.detail_coordinates()}>
						{lat.toFixed(4)}, {lng.toFixed(4)}
						{(geosite.locationIsApproximate || geosite.locationIsSensitive) && (
							<Text span size="xs" c="dimmed">
								{" "}
								{geosite.locationIsApproximate
									? m.detail_coordinates_municipality()
									: m.detail_coordinates_approximate()}
							</Text>
						)}
					</Row>
				</Table.Tbody>
			</Table>

			{geosite.scores && <Scores scores={geosite.scores} />}
			<NearbyGeosites slug={geosite.slug} onSelect={onSelectGeosite} />
			<SimilarGeosites slug={geosite.slug} onSelect={onSelectGeosite} />
			{geosite.source && <SourceCredit source={geosite.source} />}
		</Stack>
	);
}

/** ~2% of GEOSSIT photo links 404; hide those instead of showing a broken image. */
function CoverImage({ src, alt }: { src: string; alt: string }) {
	const [failed, setFailed] = useState(false);
	const ref = useRef<HTMLImageElement>(null);
	// A server-rendered photo can fail before hydration, when onError isn't
	// attached yet; catch that on mount.
	useEffect(() => {
		if (ref.current && imageFailed(ref.current)) setFailed(true);
	}, []);
	if (failed) return null;
	return (
		<Image
			ref={ref}
			src={src}
			alt={alt}
			h={220}
			radius="md"
			fit="cover"
			// Shows the slot while the photo loads, rather than a blank gap.
			bg="var(--mantine-color-default-hover)"
			loading="lazy"
			// Image's own `flex: 0` lets a flex column's min-height:auto override `h`.
			style={{ flex: "none" }}
			onError={() => setFailed(true)}
		/>
	);
}

function Scores({ scores }: { scores: GeositeScores }) {
	return (
		<Stack gap={6}>
			<Group justify="space-between" gap="xs">
				<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
					{m.detail_scores_title()}
				</Text>
				<Group gap="sm">
					<Anchor
						size="xs"
						renderRoot={(props) => (
							<Link
								{...props}
								to="/glossary"
								hash={scoreAnchor("scientific")}
							/>
						)}
					>
						{m.detail_scores_glossary()}
					</Anchor>
					<Anchor
						size="xs"
						renderRoot={(props) => <Link {...props} to="/rankings" />}
					>
						{m.detail_scores_ranking()}
					</Anchor>
				</Group>
			</Group>
			<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs">
				{SCORE_KEYS.map((key) => (
					<div key={key}>
						<Group justify="space-between" mb={2}>
							<Text size="sm">{scoreLabel(key)}</Text>
							<Text size="sm" ff="monospace">
								{scores[key]}
							</Text>
						</Group>
						<Progress
							value={(scores[key] / 400) * 100}
							color={key === "vulnerability" ? "red" : undefined}
							size="sm"
							aria-label={m.detail_score_aria({
								label: scoreLabel(key),
								value: scores[key],
							})}
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
				{m.detail_source_geossit()}{" "}
				<Anchor href={source.url} target="_blank" rel="noreferrer" size="xs">
					{m.detail_source_link()} <ArrowSquareOut size={12} />
				</Anchor>
			</Text>
			{source.authors && (
				<Text size="xs" c="dimmed" lineClamp={2}>
					{m.detail_source_authors({ authors: source.authors })}
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

const STRATA_OPTION = "strata";

function ModelsPanel({
	slug,
	approximate,
	models,
	index: requested,
	onIndexChange,
}: {
	slug: string;
	/** At its municipality's centre: no mapped strata to show. */
	approximate: boolean;
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
					label={m.detail_model_select()}
					value={model ? String(index) : STRATA_OPTION}
					onChange={(v) =>
						v !== null &&
						onIndexChange(v === STRATA_OPTION ? models.length : Number(v))
					}
					data={[
						...models.map((m, i) => ({ value: String(i), label: m.title })),
						{
							value: STRATA_OPTION,
							label: m.detail_model_strata_option(),
						},
					]}
					allowDeselect={false}
				/>
			)}
			{model ? (
				<ModelView model={model} />
			) : approximate ? (
				<NoLookups />
			) : (
				<StrataView slug={slug} />
			)}
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
					{provenanceNote(model.provenance)}
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
								{m.detail_model_source()} <ArrowSquareOut size={12} />
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
						{m.detail_strata_title({ radiusKm: mapped.radiusKm })}
					</Text>
					<Text size="xs" c="dimmed">
						{m.detail_strata_caption({
							scale: mapped.scale.toLocaleString(getLocale()),
						})}
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
						? m.detail_strata_unavailable()
						: m.detail_strata_none()}
				</Text>
			)}
		</>
	);
}

/** Fossils and strata are looked up around the point; a municipality's centre isn't the site's. */
function NoLookups() {
	return (
		<Text size="sm" c="dimmed">
			{m.detail_lookups_municipality()}
		</Text>
	);
}

function ViewerFallback() {
	return (
		<Center h="100%">
			<Loader color="gray" />
		</Center>
	);
}

import { formatGeologicAge } from "../geologic-age";
