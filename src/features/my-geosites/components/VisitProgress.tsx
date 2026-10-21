import { Group, Progress, Stack, Text } from "@mantine/core";
import { m } from "~/paraglide/messages.js";

/** "2 de 3 visitados" with a bar; counts come from this device. */
export function VisitProgress({
	visited,
	total,
}: {
	visited: number;
	total: number;
}) {
	return (
		<Stack gap={4}>
			<Group justify="space-between" gap="xs">
				<Text size="sm">{m.progress_visited({ visited, total })}</Text>
				<Text size="sm" c="dimmed" ff="monospace">
					{Math.round((visited / total) * 100)}%
				</Text>
			</Group>
			<Progress
				value={(visited / total) * 100}
				size="sm"
				color="teal"
				aria-label={m.progress_visited({ visited, total })}
			/>
		</Stack>
	);
}
