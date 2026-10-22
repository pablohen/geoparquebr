import { ActionIcon, Button, Popover, Stack, Text } from "@mantine/core";
import { DownloadSimple } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";
import { dismissInstall, promptInstall, useInstallMode } from "../prompt";

/**
 * "Instalar app" in the header, only where the browser can install it and
 * the app isn't installed yet: the browser's own dialog, or on iOS Safari a
 * short "Add to Home Screen" hint.
 */
export function InstallButton() {
	const mode = useInstallMode();
	if (!mode) return null;

	const icon = (
		<ActionIcon
			variant="default"
			size="lg"
			aria-label={m.install_app()}
			onClick={mode === "prompt" ? () => void promptInstall() : undefined}
		>
			<DownloadSimple size={18} />
		</ActionIcon>
	);
	if (mode === "prompt") return icon;

	return (
		<Popover width={260} position="bottom-end" withArrow shadow="md">
			<Popover.Target>{icon}</Popover.Target>
			<Popover.Dropdown>
				<Stack gap="xs">
					<Text fw={600} size="sm">
						{m.install_ios_title()}
					</Text>
					<Text size="sm">{m.install_ios_steps()}</Text>
					<Text size="xs" c="dimmed">
						{m.install_offline_note()}
					</Text>
					<Button
						size="compact-sm"
						variant="subtle"
						onClick={dismissInstall}
						style={{ alignSelf: "flex-start" }}
					>
						{m.install_not_now()}
					</Button>
				</Stack>
			</Popover.Dropdown>
		</Popover>
	);
}
