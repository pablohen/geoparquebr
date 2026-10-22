import { Group, Paper, Text, UnstyledButton } from "@mantine/core";
import { Sparkle } from "@phosphor-icons/react";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { getGeositeOfTheDay } from "../daily.functions";

/** A compact card for the map: today's geosite, opening it in the drawer. */
export function GeositeOfTheDay({
	onSelect,
}: {
	onSelect: (slug: string) => void;
}) {
	const query = useServerQuery("geosite-of-the-day", () =>
		getGeositeOfTheDay(),
	);
	const g = query.status === "success" ? query.data : null;
	// Nothing while loading or offline: the card is a bonus, not a feature to wait for.
	if (!g) return null;
	return (
		<Paper withBorder radius="md" p={0}>
			<UnstyledButton
				onClick={() => onSelect(g.slug)}
				aria-label={m.daily_open({ name: g.name })}
				p="xs"
				w="100%"
				style={{ borderRadius: "var(--mantine-radius-md)" }}
			>
				<Group gap="xs" wrap="nowrap" align="flex-start">
					<Sparkle
						size={18}
						weight="duotone"
						color="var(--mantine-primary-color-filled)"
						aria-hidden
						style={{ flex: "none", marginTop: 2 }}
					/>
					<div style={{ minWidth: 0 }}>
						<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
							{m.daily_title()}
						</Text>
						<Text size="sm" fw={600} lineClamp={2}>
							{g.name}
						</Text>
						<Text size="xs" c="dimmed">
							{g.municipality} – {g.state}
						</Text>
					</div>
				</Group>
			</UnstyledButton>
		</Paper>
	);
}
