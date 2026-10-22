import {
	Badge,
	Button,
	Collapse,
	Drawer,
	Group,
	Stack,
	Text,
	UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CaretDown, CaretUp, ListBullets } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { m } from "~/paraglide/messages.js";

type Props = {
	opened: boolean;
	onOpen: () => void;
	onClose: () => void;
	count: number;
	filtered: boolean;
	/** Replaces the default title, e.g. in "Perto de mim". */
	title?: string;
	/** Location form + filters, tucked behind a toggle so the list leads. */
	controls: ReactNode;
	list: ReactNode;
};

/**
 * Phone layout: the map stays full-screen and the geosite list lives in a
 * bottom sheet opened from a floating button. Hidden from `sm` up, where the
 * AppShell sidebar shows the same content.
 */
export function MobileListSheet({
	opened,
	onOpen,
	onClose,
	count,
	filtered,
	title,
	controls,
	list,
}: Props) {
	const [controlsOpen, { toggle: toggleControls }] = useDisclosure(false);

	return (
		<>
			<Button
				hiddenFrom="sm"
				pos="absolute"
				bottom={32}
				left="50%"
				style={{ transform: "translateX(-50%)", zIndex: 3 }}
				radius="xl"
				size="md"
				leftSection={<ListBullets size={18} />}
				rightSection={
					filtered ? (
						<Badge size="xs" variant="white" color="dark">
							{m.sheet_filters_badge()}
						</Badge>
					) : null
				}
				onClick={onOpen}
				aria-label={m.sheet_open_list_aria({ count })}
			>
				{m.sheet_count({ count })}
			</Button>

			<Drawer
				hiddenFrom="sm"
				opened={opened}
				onClose={onClose}
				position="bottom"
				size="85%"
				radius="lg"
				title={
					<Text fw={600}>
						{title ??
							(filtered
								? m.sheet_title_filtered({ count })
								: m.sheet_title({ count }))}
					</Text>
				}
				styles={{ body: { paddingInline: 4 } }}
			>
				<Stack gap="xs">
					<UnstyledButton
						onClick={toggleControls}
						px="sm"
						py={6}
						aria-expanded={controlsOpen}
					>
						<Group justify="space-between">
							<Text size="sm" fw={500} component="div">
								{m.sheet_controls()}
								{filtered && (
									<Badge size="xs" ml={6} variant="light">
										{m.sheet_controls_active()}
									</Badge>
								)}
							</Text>
							{controlsOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
						</Group>
					</UnstyledButton>
					<Collapse expanded={controlsOpen}>
						<Stack gap="md" px="sm" pb="sm">
							{controls}
						</Stack>
					</Collapse>
					{list}
				</Stack>
			</Drawer>
		</>
	);
}
