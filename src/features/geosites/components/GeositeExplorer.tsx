import {
	ActionIcon,
	AppShell,
	Box,
	Burger,
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
import { lazy, Suspense } from "react";
import { type BBox, bboxAround, bboxCenter, roundBBox } from "~/lib/geo";
import { useServerQuery } from "~/lib/use-server-query";
import { getGeositeBySlug } from "../geosites.functions";
import type {
	ExplorerSearch,
	GeositeSummary,
	LocationFormValues,
} from "../schemas";
import { GeositeDrawer } from "./GeositeDrawer";
import { GeositeList } from "./GeositeList";
import { LocationForm } from "./LocationForm";

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
	const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();

	// The full record is fetched by slug, so a shared link opens the drawer
	// even when the geosite lies outside the current viewport or filters.
	const slug = search.site;
	const detail = useServerQuery(slug ? `geosite:${slug}` : null, () =>
		getGeositeBySlug({ data: { slug: slug as string } }),
	);

	const select = (next: string) => {
		// A different geosite starts on its overview tab.
		onSearchChange({ site: next, tab: undefined, model: undefined });
		closeNav();
	};

	return (
		<AppShell
			header={{ height: 56 }}
			navbar={{
				width: 380,
				breakpoint: "sm",
				collapsed: { mobile: !navOpened },
			}}
			padding={0}
		>
			<AppShell.Header>
				<Group h="100%" px="md" justify="space-between">
					<Group gap="xs">
						<Burger
							opened={navOpened}
							onClick={toggleNav}
							hiddenFrom="sm"
							size="sm"
							aria-label="Abrir lista"
						/>
						<Mountains
							size={26}
							weight="duotone"
							color="var(--mantine-primary-color-filled)"
						/>
						<Title order={1} size="h4">
							GeoparqueBR
						</Title>
					</Group>
					<ColorSchemeToggle />
				</Group>
			</AppShell.Header>

			<AppShell.Navbar>
				<AppShell.Section
					p="md"
					style={{ borderBottom: "1px solid var(--app-shell-border-color)" }}
				>
					<LocationForm
						values={formValuesFor(search.bbox)}
						onSubmit={({ lng, lat, radiusKm }) =>
							onSearchChange({
								bbox: roundBBox(bboxAround([lng, lat], radiusKm)),
							})
						}
					/>
				</AppShell.Section>
				<AppShell.Section px="md" pt="sm">
					<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
						{geosites.length} geossítios nesta área
					</Text>
				</AppShell.Section>
				<AppShell.Section grow component={ScrollArea} p="xs">
					<GeositeList
						geosites={geosites}
						selectedSlug={search.site}
						onSelect={select}
					/>
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
							/>
						</Suspense>
					</ClientOnly>
				</Box>
			</AppShell.Main>

			<GeositeDrawer
				opened={slug !== undefined}
				geosite={detail.data ?? null}
				status={detail.status}
				view={{ tab: search.tab, model: search.model }}
				onViewChange={(view) => onSearchChange(view)}
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
			aria-label={`Tema ${next}`}
		>
			{computed === "dark" ? <Sun size={18} /> : <Moon size={18} />}
		</ActionIcon>
	);
}
