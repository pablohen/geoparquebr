import { Box, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { getLocale } from "~/paraglide/runtime.js";

export type Bar = {
	key: string;
	label: ReactNode;
	count: number;
	/** The bar's colour; the primary colour when omitted. */
	color?: string;
};

type Props = {
	bars: Bar[];
	/** Accessible name of the list. */
	label: string;
	/** Count the longest bar stands for; the largest count by default. */
	max?: number;
};

/**
 * Horizontal bars, one per row, each with its label and number in text, so
 * the bars only repeat what is written (and are hidden from screen readers).
 */
export function BarList({ bars, label, max }: Props) {
	const top = max ?? Math.max(1, ...bars.map((b) => b.count));
	return (
		<Stack component="ul" gap={8} m={0} p={0} aria-label={label}>
			{bars.map((b) => (
				<Box component="li" key={b.key} style={{ listStyle: "none" }}>
					<Group justify="space-between" gap="xs" wrap="nowrap" mb={2}>
						<Text size="sm" style={{ minWidth: 0 }}>
							{b.label}
						</Text>
						<Text
							size="sm"
							fw={600}
							style={{ fontVariantNumeric: "tabular-nums" }}
						>
							{b.count.toLocaleString(getLocale())}
						</Text>
					</Group>
					<Box
						aria-hidden
						h={8}
						style={{
							borderRadius: 4,
							background: "var(--mantine-color-default-hover)",
						}}
					>
						<Box
							h="100%"
							w={`${(b.count / top) * 100}%`}
							style={{
								borderRadius: 4,
								background: b.color ?? "var(--mantine-primary-color-filled)",
								// Pale chart colours (Quaternary yellow) keep an edge on white.
								boxShadow: b.color
									? "inset 0 0 0 1px rgb(0 0 0 / 0.12)"
									: undefined,
							}}
						/>
					</Box>
				</Box>
			))}
		</Stack>
	);
}
