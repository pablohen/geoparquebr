import { CloseButton, Group, Loader, Paper, Stack, Text } from "@mantine/core";
import { useServerQuery } from "~/lib/use-server-query";
import { getGeologyAt } from "../geology.functions";
import { formatAgeRange, icsColorForAge, midAge } from "../time-scale";

type Props = {
	point: [number, number];
	onClose: () => void;
};

/** What the SGB 1:1M map shows under a clicked point. */
export function GeologyAtPointCard({ point: [lng, lat], onClose }: Props) {
	const result = useServerQuery(
		`geology-at:${lng.toFixed(3)},${lat.toFixed(3)}`,
		() => getGeologyAt({ data: { lng, lat } }),
	);
	const data = result.data;

	return (
		<Paper
			pos="absolute"
			left={12}
			// Above the phone list button; near the scale bar on desktop.
			bottom={{ base: 84, sm: 36 }}
			p="sm"
			radius="md"
			shadow="md"
			w={340}
			maw="calc(100% - 24px)"
			style={{ zIndex: 2 }}
		>
			<Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
				<Text size="xs" c="dimmed">
					{lat.toFixed(4)}, {lng.toFixed(4)}
				</Text>
				<CloseButton size="sm" onClick={onClose} aria-label="Fechar" />
			</Group>
			{result.status === "pending" ? (
				<Loader size="sm" type="dots" />
			) : data?.status === "ok" && data.units.length > 0 ? (
				<Stack gap="xs">
					{data.units.map((u) => (
						<Stack key={u.code} gap={2}>
							<Group gap={6} wrap="nowrap">
								<span
									style={{
										width: 10,
										height: 10,
										borderRadius: 2,
										flex: "none",
										background: icsColorForAge(midAge(u.minMa, u.maxMa)),
									}}
								/>
								<Text size="sm" fw={600}>
									{u.name}{" "}
									<Text span size="xs" ff="monospace" c="dimmed">
										{u.code}
									</Text>
								</Text>
							</Group>
							<Text size="xs">
								{[u.rank, formatAgeRange(u.minMa, u.maxMa), u.period]
									.filter(Boolean)
									.join(" · ")}
							</Text>
							{u.lithology && (
								<Text size="xs" c="dimmed" lineClamp={3}>
									{u.lithology}
								</Text>
							)}
						</Stack>
					))}
				</Stack>
			) : (
				<Text size="sm" c="dimmed">
					{data?.status === "unavailable" || result.status === "error"
						? "Serviço do SGB indisponível no momento."
						: "Nenhuma unidade mapeada neste ponto."}
				</Text>
			)}
		</Paper>
	);
}
