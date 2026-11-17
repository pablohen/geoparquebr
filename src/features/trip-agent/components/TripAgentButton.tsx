import { ActionIcon, Center, Drawer, Loader, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Sparkle } from "@phosphor-icons/react";
import { lazy, Suspense, useState } from "react";
import { m } from "~/paraglide/messages.js";
import { tripAgentEnabled } from "../enabled";

// eve's client loads only once someone opens the planner.
const TripAgentChat = lazy(() => import("./TripAgentChat"));

/** Header button that opens the trip planner chat in a drawer. */
export function TripAgentButton() {
	const [opened, { open, close }] = useDisclosure(false);
	// Mounted from the first open on, and kept mounted while closed, so the
	// conversation survives closing the drawer.
	const [started, setStarted] = useState(false);
	if (!tripAgentEnabled) return null;
	return (
		<>
			<Tooltip label={m.agent_open()} withinPortal>
				<ActionIcon
					variant="default"
					size="lg"
					aria-label={m.agent_open()}
					onClick={() => {
						setStarted(true);
						open();
					}}
				>
					<Sparkle size={18} />
				</ActionIcon>
			</Tooltip>
			<Drawer
				opened={opened}
				onClose={close}
				position="right"
				size="md"
				title={m.agent_title()}
				keepMounted
				styles={{
					content: { display: "flex", flexDirection: "column" },
					body: { flex: 1, display: "flex", minHeight: 0 },
				}}
			>
				{started && (
					<Suspense
						fallback={
							<Center flex={1}>
								<Loader size="sm" />
							</Center>
						}
					>
						<TripAgentChat onNavigate={close} />
					</Suspense>
				)}
			</Drawer>
		</>
	);
}
