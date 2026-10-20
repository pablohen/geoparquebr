import { Center, Drawer, Loader, Stack, Text, Title } from "@mantine/core";
import { useIsMobile } from "~/lib/use-is-mobile";
import type { Geosite } from "../schemas";
import { GeositeDetail, type GeositeView, geoparkLabel } from "./GeositeDetail";

type Props = {
	opened: boolean;
	/** Full record, once loaded. */
	geosite: Geosite | null;
	status: "idle" | "pending" | "success" | "error";
	view: GeositeView;
	onViewChange: (next: GeositeView) => void;
	onClose: () => void;
};

export function GeositeDrawer({
	opened,
	geosite,
	status,
	view,
	onViewChange,
	onClose,
}: Props) {
	// A bottom sheet on phones keeps a strip of map in view; a side panel on desktop.
	const isMobile = useIsMobile();
	return (
		<Drawer
			opened={opened}
			onClose={onClose}
			position={isMobile ? "bottom" : "right"}
			size={isMobile ? "92%" : "xl"}
			radius={isMobile ? "lg" : 0}
			title={
				geosite && (
					<Stack gap={2}>
						<Title order={2} size="h3" fz={{ base: "h4", sm: "h3" }}>
							{geosite.name}
						</Title>
						<Text size="sm" c="dimmed">
							{geoparkLabel(geosite)}
						</Text>
					</Stack>
				)
			}
		>
			{geosite ? (
				<GeositeDetail
					geosite={geosite}
					view={view}
					onViewChange={onViewChange}
				/>
			) : status === "error" ? (
				<Text c="dimmed">Geossítio não encontrado.</Text>
			) : (
				<Center py="xl">
					<Loader type="dots" />
				</Center>
			)}
		</Drawer>
	);
}
