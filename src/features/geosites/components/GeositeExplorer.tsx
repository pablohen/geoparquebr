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
import type { ExplorerSearch, GeositeWithDistance } from "../schemas";
import { GeositeDrawer } from "./GeositeDrawer";
import { GeositeList } from "./GeositeList";
import { LocationForm } from "./LocationForm";

// MapLibre touches `window` at import time, so it only loads in the browser.
const GeositeMap = lazy(() => import("./GeositeMap"));

type Props = {
	geosites: GeositeWithDistance[];
	search: ExplorerSearch;
	onSearchChange: (next: Partial<ExplorerSearch>) => void;
};

export function GeositeExplorer({ geosites, search, onSearchChange }: Props) {
	const [navOpened, { toggle: toggleNav, close: closeNav }] = useDisclosure();
	const selected = geosites.find((g) => g.slug === search.site) ?? null;

	const select = (slug: string) => {
		onSearchChange({ site: slug });
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
						values={{
							lng: search.lng,
							lat: search.lat,
							radiusKm: search.radiusKm,
						}}
						onSubmit={(values) => onSearchChange(values)}
					/>
				</AppShell.Section>
				<AppShell.Section px="md" pt="sm">
					<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
						{geosites.length} geossítios em {search.radiusKm} km
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
								center={{ lng: search.lng, lat: search.lat }}
								selectedSlug={search.site}
								onSelect={select}
								onSearchArea={(center) => onSearchChange(center)}
							/>
						</Suspense>
					</ClientOnly>
				</Box>
			</AppShell.Main>

			<GeositeDrawer
				geosite={selected}
				onClose={() => onSearchChange({ site: undefined })}
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
