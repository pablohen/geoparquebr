import { Center, Drawer, Loader, Stack, Text, Title } from "@mantine/core";
import { GeoparkName } from "~/features/geoparks/components/GeoparkName";
import { useIsMobile } from "~/lib/use-is-mobile";
import { m } from "~/paraglide/messages.js";
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
		// The compound form so the header isn't a second page <header> (banner)
		// and the title's <h2> isn't nested in Mantine's own <h2>.
		<Drawer.Root
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
		>
			<Drawer.Overlay />
			<Drawer.Content>
				{/* Keep the close button level with the name, not the middle of the block. */}
				<Drawer.Header component="div" style={{ alignItems: "flex-start" }}>
					<Drawer.Title component="div">
						{geosite && (
							<Stack gap={6}>
								<Title order={2} size="h3" fz={{ base: "h4", sm: "h3" }}>
									{geosite.name}
								</Title>
								<Text size="sm" c="dimmed">
									<GeoparkName geosite={geosite} />
								</Text>
								<GeositeActions geosite={geosite} context="drawer" />
							</Stack>
						)}
					</Drawer.Title>
					<Drawer.CloseButton aria-label={m.common_close()} />
				</Drawer.Header>
				<Drawer.Body>
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
				</Drawer.Body>
			</Drawer.Content>
		</Drawer.Root>
	);
}
