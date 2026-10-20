import {
	ActionIcon,
	AppShell,
	Box,
	Group,
	Loader,
	ScrollArea,
	Text,
	Title,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Moon, Mountains, Sun } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { GeologyAtPointCard } from "~/features/geology/components/GeologyAtPointCard";
import { GeologyLayerControl } from "~/features/geology/components/GeologyLayerControl";
import { LanguageSwitcher } from "~/features/i18n/components/LanguageSwitcher";
import { SearchBox } from "~/features/search/components/SearchBox";
import { type BBox, bboxAround, bboxCenter, roundBBox } from "~/lib/geo";
import { SITE_NAME } from "~/lib/site";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { getGeositeBySlug } from "../geosites.functions";
import type {
	ExplorerSearch,
	GeositeSummary,
	LocationFormValues,
} from "../schemas";
import { GeositeDrawer } from "./GeositeDrawer";
import { GeositeFilters } from "./GeositeFilters";
import { GeositeList } from "./GeositeList";
import { LocationForm } from "./LocationForm";
import { MobileListSheet } from "./MobileListSheet";

// MapLibre touches `window` at import time, so it only loads in the browser.
const GeositeMap = lazy(() => import("./GeositeMap"));

type SearchChange = (
	next: Partial<ExplorerSearch>,
	options?: { replace?: boolean },
) => void;

type Props = {
	geosites: GeositeSummary[];
	search: ExplorerSearch;
	onSearchChange: SearchChange;
};

/** Centre and half-height of the viewport, as "go to point" form values. */
function formValuesFor(bbox: BBox): LocationFormValues {
	const [lng, lat] = bboxCenter(bbox);
	const halfHeightKm = ((bbox[3] - bbox[1]) / 2) * 111.32;
	return {
		lng: Math.round(lng * 1e4) / 1e4,
		lat: Math.round(lat * 1e4) / 1e4,
		radiusKm: Math.min(1_000, Math.max(5, Math.round(halfHeightKm / 5) * 5)),
	};
}

export function GeositeExplorer({ geosites, search, onSearchChange }: Props) {
	// Phone list sheet; from `sm` up the AppShell sidebar is always visible.
	const [sheetOpened, { open: openSheet, close: closeSheet }] = useDisclosure();
	const [geologyOpacity, setGeologyOpacity] = useState(0.7);
	const [identifyPoint, setIdentifyPoint] = useState<[number, number]>();
	const geologyVisible = search.geo === true;

	// The full record is fetched by slug, so a shared link opens the drawer
	// even when the geosite lies outside the current viewport or filters.
	const slug = search.site;
	const detail = useServerQuery(slug ? `geosite:${slug}` : null, () =>
		getGeositeBySlug({ data: { slug: slug as string } }),
	);

	const select = (next: string) => {
		// A different geosite starts on its overview tab.
		onSearchChange({ site: next, tab: undefined, model: undefined });
		closeSheet();
	};

	const filtered = Boolean(search.cat || search.rel || search.gp || search.age);
	const locationForm = (
		<LocationForm
			values={formValuesFor(search.bbox)}
			onSubmit={({ lng, lat, radiusKm }) => {
				onSearchChange({
					bbox: roundBBox(bboxAround([lng, lat], radiusKm)),
				});
				closeSheet();
			}}
		/>
	);
	const filters = (
		<GeositeFilters
			value={{
				cat: search.cat,
				rel: search.rel,
				gp: search.gp,
				age: search.age,
			}}
			onChange={(next) => onSearchChange(next)}
		/>
	);
	const list = (
		<GeositeList
			geosites={geosites}
			selectedSlug={search.site}
			onSelect={select}
		/>
	);

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={{
				width: 380,
				breakpoint: "sm",
				// Phones use the bottom sheet instead (MobileListSheet).
				collapsed: { mobile: true },
			}}
			padding={0}
		>
			<AppShell.Header>
				<Group h="100%" px={{ base: "xs", sm: "md" }} gap="xs" wrap="nowrap">
					<Group gap="xs" wrap="nowrap" style={{ flex: "none" }}>
						<Mountains
							size={26}
							weight="duotone"
							color="var(--mantine-primary-color-filled)"
							aria-hidden
						/>
						<Title order={1} size="h4" visibleFrom="sm">
							{SITE_NAME}
						</Title>
					</Group>
					{/* On phones the search takes all the remaining width. */}
					<Group
						gap="xs"
						wrap="nowrap"
						justify="flex-end"
						style={{ flex: 1, minWidth: 0 }}
					>
						<SearchBox
							onSelectGeosite={select}
							onSelectPlace={(place) =>
								onSearchChange({
									bbox: roundBBox(place.bbox ?? bboxAround(place.point, 15)),
								})
							}
						/>
						<LanguageSwitcher />
						<ColorSchemeToggle />
					</Group>
				</Group>
			</AppShell.Header>

			<AppShell.Navbar>
				<AppShell.Section
					p="md"
					style={{ borderBottom: "1px solid var(--app-shell-border-color)" }}
				>
					{locationForm}
				</AppShell.Section>
				<AppShell.Section
					p="md"
					style={{ borderBottom: "1px solid var(--app-shell-border-color)" }}
				>
					{filters}
				</AppShell.Section>
				<AppShell.Section px="md" pt="sm">
					<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
						{filtered
							? m.explorer_count_filtered({ count: geosites.length })
							: m.explorer_count({ count: geosites.length })}
					</Text>
				</AppShell.Section>
				<AppShell.Section grow component={ScrollArea} p="xs">
					{list}
				</AppShell.Section>
			</AppShell.Navbar>

			<AppShell.Main>
				<Box pos="relative" h="calc(100dvh - var(--app-shell-header-height))">
					<ClientOnly fallback={<MapFallback />}>
						<Suspense fallback={<MapFallback />}>
							<GeositeMap
								geosites={geosites}
								bbox={search.bbox}
								selectedSlug={search.site}
								focus={detail.data?.location.coordinates}
								onSelect={select}
								// Panning shouldn't flood history; only explicit actions push.
								onViewportChange={(bbox) =>
									onSearchChange({ bbox }, { replace: true })
								}
								geology={{ visible: geologyVisible, opacity: geologyOpacity }}
								onIdentify={setIdentifyPoint}
								identifyPoint={geologyVisible ? identifyPoint : undefined}
							/>
						</Suspense>
					</ClientOnly>
					<GeologyLayerControl
						visible={geologyVisible}
						opacity={geologyOpacity}
						onVisibleChange={(on) => {
							onSearchChange({ geo: on ? true : undefined });
							if (!on) setIdentifyPoint(undefined);
						}}
						onOpacityChange={setGeologyOpacity}
					/>
					<MobileListSheet
						opened={sheetOpened}
						onOpen={openSheet}
						onClose={closeSheet}
						count={geosites.length}
						filtered={filtered}
						controls={
							<>
								{filters}
								{locationForm}
							</>
						}
						list={list}
					/>
					{geologyVisible && identifyPoint && (
						<GeologyAtPointCard
							key={identifyPoint.join(",")}
							point={identifyPoint}
							onClose={() => setIdentifyPoint(undefined)}
						/>
					)}
				</Box>
			</AppShell.Main>

			<GeositeDrawer
				opened={slug !== undefined}
				geosite={detail.data ?? null}
				status={detail.status}
				view={{ tab: search.tab, model: search.model }}
				onViewChange={(view) => onSearchChange(view)}
				onSelectGeosite={select}
				onClose={() =>
					onSearchChange({ site: undefined, tab: undefined, model: undefined })
				}
			/>
		</AppShell>
	);
}

function MapFallback() {
	return (
		<Group h="100%" justify="center">
			<Loader type="dots" />
		</Group>
	);
}

function ColorSchemeToggle() {
	const { setColorScheme } = useMantineColorScheme();
	const computed = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});
	const next = computed === "dark" ? "light" : "dark";
	return (
		<ActionIcon
			variant="default"
			size="lg"
			onClick={() => setColorScheme(next)}
			aria-label={
				next === "dark" ? m.explorer_theme_dark() : m.explorer_theme_light()
			}
		>
			{computed === "dark" ? <Sun size={18} /> : <Moon size={18} />}
		</ActionIcon>
	);
}
