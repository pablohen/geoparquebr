import { Anchor, Box, Center, Group, Loader, Paper, Text } from "@mantine/core";
import { ArrowSquareOut, Mountains } from "@phosphor-icons/react";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import type { EmbedPoint } from "./EmbedMap";

// MapLibre touches `window` at import time, so it only loads in the browser.
const EmbedMap = lazy(() => import("./EmbedMap"));

type Props = {
	title: string;
	/** Absolute URL of the full page on GeoparqueBR. */
	pageUrl: string;
	points: EmbedPoint[];
};

/** A whole-window map with a credit bar, for `<iframe>`s on other sites. */
export function EmbedFrame({ title, pageUrl, points }: Props) {
	const loading = (
		<Center h="100%">
			<Loader type="dots" />
		</Center>
	);
	return (
		<Box pos="relative" h="100dvh" style={{ overflow: "hidden" }}>
			<ClientOnly fallback={loading}>
				<Suspense fallback={loading}>
					<EmbedMap points={points} />
				</Suspense>
			</ClientOnly>
			<Paper
				pos="absolute"
				top={10}
				left={10}
				p="xs"
				radius="md"
				shadow="sm"
				maw="calc(100% - 70px)"
				style={{ zIndex: 2 }}
			>
				<Group gap={6} wrap="nowrap">
					<Mountains
						size={18}
						weight="duotone"
						color="var(--mantine-primary-color-filled)"
						aria-hidden
						style={{ flex: "none" }}
					/>
					<Text size="sm" fw={600} lineClamp={1}>
						{title}
					</Text>
				</Group>
				<Group gap={6} mt={2} wrap="wrap">
					<Anchor href={pageUrl} target="_blank" rel="noopener" size="xs">
						{m.embed_view_full()} <ArrowSquareOut size={11} />
					</Anchor>
					<Text size="xs" c="dimmed">
						· {m.embed_credit()} · {SITE_NAME}
					</Text>
				</Group>
			</Paper>
		</Box>
	);
}
