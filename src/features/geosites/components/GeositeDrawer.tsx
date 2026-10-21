import { Center, Drawer, Loader, Stack, Text, Title } from "@mantine/core";
import { useIsMobile } from "~/lib/use-is-mobile";
import { m } from "~/paraglide/messages.js";
import { geoparkLabel } from "../labels";
import type { Geosite } from "../schemas";
import { GeositeActions } from "./GeositeActions";
import { GeositeDetail, type GeositeView } from "./GeositeDetail";

type Props = {
	opened: boolean;
	/** Full record, once loaded. */
	geosite: Geosite | null;
	status: "idle" | "pending" | "success" | "error";
	view: GeositeView;
	onViewChange: (next: GeositeView) => void;
	onSelectGeosite: (slug: string) => void;
	onClose: () => void;
};

export function GeositeDrawer({
	opened,
	geosite,
	status,
	view,
	onViewChange,
	onSelectGeosite,
	onClose,
}: Props) {
	// A bottom sheet on phones keeps a strip of map in view; a side panel on desktop.
	const isMobile = useIsMobile();
	return (
		<Drawer
			opened={opened}
			onClose={onClose}
			position={isMobile ? "bottom" : "right"}
			// On phones the sheet stops below the header, which stays usable
			// (search, language, theme) above the overlay: see GeositeExplorer.
			size={
				isMobile
					? "calc(100% - var(--app-shell-header-height, 56px) - 8px)"
					: "xl"
			}
			trapFocus={!isMobile}
			radius={isMobile ? "lg" : 0}
			title={
				geosite && (
					<Stack gap={6}>
						<Title order={2} size="h3" fz={{ base: "h4", sm: "h3" }}>
							{geosite.name}
						</Title>
						<Text size="sm" c="dimmed">
							{geoparkLabel(geosite)}
						</Text>
						<GeositeActions geosite={geosite} context="drawer" />
					</Stack>
				)
			}
		>
			{geosite ? (
				<GeositeDetail
					geosite={geosite}
					view={view}
					onViewChange={onViewChange}
					onSelectGeosite={onSelectGeosite}
				/>
			) : status === "error" ? (
				<Text c="dimmed">{m.drawer_not_found()}</Text>
			) : (
				<Center py="xl">
					<Loader type="dots" />
				</Center>
			)}
		</Drawer>
	);
}
