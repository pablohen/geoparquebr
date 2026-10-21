import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** A titled block of a stats page, with an optional note under the title. */
export function Section({
	title,
	note,
	children,
}: {
	title: string;
	note?: string;
	children: ReactNode;
}) {
	return (
		<Stack gap="sm" component="section">
			<Stack gap={2}>
				<Title order={2} size="h4">
					{title}
				</Title>
				{note && (
					<Text size="xs" c="dimmed">
						{note}
					</Text>
				)}
			</Stack>
			{children}
		</Stack>
	);
}
