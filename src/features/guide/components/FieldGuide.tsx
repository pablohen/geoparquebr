import {
	Anchor,
	Badge,
	Box,
	Button,
	Group,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { ArrowLeft, Printer } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { formatGeologicAge } from "~/features/geosites/geologic-age";
import {
	categoryLabel,
	geoparkIdLabel,
	relevanceLabel,
} from "~/features/geosites/labels";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import type { GuideEntry } from "../schemas";

/**
 * Print-friendly page: light colours, no app chrome; a geosite's heading never
 * splits from its text, while long descriptions flow onto the next page.
 */
const PRINT_CSS = `
@media print {
	html, html[data-mantine-color-scheme] {
		color-scheme: light;
		--mantine-color-body: #fff;
		--mantine-color-text: #111;
		--mantine-color-dimmed: #555;
		--mantine-color-default-border: #bbb;
		--mantine-color-anchor: #111;
	}
	body { background: #fff; color: #111; }
	[data-print-hide] { display: none !important; }
	/* Keep each geosite's heading and QR together, and with the text after it. */
	[data-guide-head] { break-inside: avoid; break-after: avoid; }
	@page { margin: 14mm; }
}
`;

type Props = {
	title: string;
	entries: GuideEntry[];
	/** Where "Voltar" leads (the geopark or the trip). */
	back: ReactNode;
};

export function FieldGuide({ title, entries, back }: Props) {
	// One time zone on server and client, so hydration sees the same date.
	const today = new Intl.DateTimeFormat(getLocale(), {
		dateStyle: "long",
		timeZone: "America/Sao_Paulo",
	}).format(new Date());

	return (
		<Stack gap="lg">
			<style>{PRINT_CSS}</style>
			<Group justify="space-between" data-print-hide>
				{back}
				<Button
					size="xs"
					leftSection={<Printer size={14} />}
					onClick={() => window.print()}
				>
					{m.guide_print()}
				</Button>
			</Group>

			<Stack gap={6}>
				<Text size="sm" c="dimmed" tt="uppercase" fw={600}>
					{m.guide_eyebrow()}
				</Text>
				<Title order={1} size="h2">
					{title}
				</Title>
				<Text size="sm" c="dimmed" data-print-hide>
					{m.guide_intro()}
				</Text>
				<Text size="xs" c="dimmed">
					{m.guide_generated({ date: today })}
				</Text>
			</Stack>

			{entries.length === 0 && <Text c="dimmed">{m.guide_empty()}</Text>}

			{entries.map((e, i) => (
				<GuideEntryBlock key={e.slug} entry={e} number={i + 1} />
			))}
		</Stack>
	);
}

function GuideEntryBlock({
	entry: e,
	number,
}: {
	entry: GuideEntry;
	number: number;
}) {
	const [lng, lat] = e.point;
	const coordinates = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
	return (
		<Box
			data-guide-entry
			pt="md"
			style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}
		>
			<Group
				data-guide-head
				align="flex-start"
				justify="space-between"
				wrap="nowrap"
				gap="md"
			>
				<Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
					<Title order={2} size="h4">
						{number}. {e.name}
					</Title>
					<Text size="sm" c="dimmed">
						{e.municipality} – {e.state}
						{e.geoparkId && <> · {geoparkIdLabel(e.geoparkId)}</>}
					</Text>
					<Group gap={6}>
						{e.categories.map((c) => (
							<Badge key={c} size="xs" variant="default">
								{categoryLabel(c)}
							</Badge>
						))}
						<Badge size="xs" variant="default">
							{relevanceLabel(e.relevance)}
						</Badge>
					</Group>
				</Stack>
				<Box
					w={84}
					h={84}
					style={{ flex: "none" }}
					role="img"
					aria-label={m.guide_qr_alt({ name: e.name })}
					// SVG generated on our server from the geosite's own URL.
					// biome-ignore lint/security/noDangerouslySetInnerHtml: trusted, server-generated QR markup
					dangerouslySetInnerHTML={{ __html: e.qrSvg }}
				/>
			</Group>

			<Stack gap={6} mt="sm">
				{e.geologicAge && (
					<Fact
						label={
							e.geologicAge.mapScale
								? m.detail_mapped_rock()
								: m.detail_geological_age()
						}
					>
						{formatGeologicAge(e.geologicAge)}
					</Fact>
				)}
				<Fact label={m.detail_coordinates()}>
					{e.approximate
						? m.guide_coordinates_approximate({ coordinates })
						: coordinates}
				</Fact>
				<Text size="sm" style={{ whiteSpace: "pre-line" }}>
					{e.text}
				</Text>
				<Text size="xs" c="dimmed">
					{m.detail_source_geossit()}
					{e.sourceUrl && (
						<>
							{" "}
							<Anchor href={e.sourceUrl} size="xs">
								{e.sourceUrl}
							</Anchor>
						</>
					)}
				</Text>
			</Stack>
		</Box>
	);
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
	return (
		<Text size="sm">
			<Text span fw={600} size="sm">
				{label}:
			</Text>{" "}
			{children}
		</Text>
	);
}

/** "← Voltar" for the guide's toolbar. */
export function GuideBack({ children }: { children: ReactNode }) {
	return (
		<Group gap={4}>
			<ArrowLeft size={14} />
			{children}
		</Group>
	);
}
