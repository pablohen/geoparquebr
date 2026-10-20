import {
	Alert,
	Anchor,
	Badge,
	Button,
	Center,
	Group,
	Loader,
	Paper,
	Stack,
	Text,
} from "@mantine/core";
import { ArrowSquareOut, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { useServerQuery } from "~/lib/use-server-query";
import { getGeositeFossils } from "../geology.functions";
import {
	FOSSIL_SOURCE_LABELS,
	type FossilOccurrence,
	type GeositeFossils,
} from "../schemas";

const PAGE = 15;

export function FossilsPanel({ slug }: { slug: string }) {
	const query = useServerQuery(`fossils:${slug}`, () =>
		getGeositeFossils({ data: { slug } }),
	);

	if (query.status === "pending" || query.status === "idle")
		return (
			<Center py="xl">
				<Loader type="dots" />
			</Center>
		);
	if (query.status === "error")
		return (
			<Alert color="red" icon={<Warning />}>
				Não foi possível consultar as ocorrências fósseis.
			</Alert>
		);
	return <FossilsList data={query.data} />;
}

function FossilsList({ data }: { data: GeositeFossils }) {
	const [shown, setShown] = useState(PAGE);
	const sources = [data.sgb, data.gbif];
	const items = sources
		.flatMap((s) => (s.status === "ok" ? s.items : []))
		.sort((a, b) => a.distanceKm - b.distanceKm);
	const unavailable = (["sgb", "gbif"] as const).filter(
		(k) => data[k].status === "unavailable",
	);

	return (
		<Stack>
			<Text size="sm">
				Ocorrências fósseis registradas num raio de {data.radiusKm} km do
				geossítio.
			</Text>
			<Group gap="xs">
				{(["sgb", "gbif"] as const).map((k) => {
					const s = data[k];
					return (
						<Badge
							key={k}
							variant="light"
							color={s.status === "ok" ? "gray" : "red"}
						>
							{FOSSIL_SOURCE_LABELS[k]}:{" "}
							{s.status === "ok" ? s.total : "indisponível"}
						</Badge>
					);
				})}
			</Group>
			{unavailable.length > 0 && (
				<Alert color="yellow" icon={<Warning />} p="xs">
					{unavailable.map((k) => FOSSIL_SOURCE_LABELS[k]).join(" e ")} fora do
					ar no momento; a lista pode estar incompleta.
				</Alert>
			)}

			{items.length === 0 ? (
				<Text c="dimmed" size="sm">
					Nenhuma ocorrência registrada nas bases consultadas.
				</Text>
			) : (
				<>
					<TopTaxa items={items} />
					{items.slice(0, shown).map((item) => (
						<OccurrenceCard key={`${item.source}:${item.id}`} item={item} />
					))}
					{items.length > shown && (
						<Button variant="subtle" onClick={() => setShown(items.length)}>
							Mostrar todas ({items.length})
						</Button>
					)}
				</>
			)}

			<Text size="xs" c="dimmed">
				Fontes: SGB/CPRM — Ocorrências Fossilíferas (OGC API); GBIF.org, com
				dados das instituições publicadoras. Cada registro mantém sua licença.
			</Text>
		</Stack>
	);
}

/**
 * Drops authorship for display: "Dastilbe elongatus Santos, 1947" →
 * "Dastilbe elongatus", "Dastilbe Jordan, 1910" → "Dastilbe".
 */
export function shortTaxon(name: string): string {
	const match = name.match(/^(.*?)[,\s]*\(?\d{4}\)?.*$/);
	if (!match?.[1]) return name;
	const words = match[1].trim().split(/\s+/);
	if (words.length >= 3) return words.slice(0, 2).join(" ");
	if (words[1] && /^[A-Z]/.test(words[1])) return words[0] ?? name;
	return words.join(" ");
}

/** The most specific name of each record, counted, to summarise what's there. */
function TopTaxa({ items }: { items: FossilOccurrence[] }) {
	// Keyed case-insensitively so "DASTILBE" (SGB) and "Dastilbe" (GBIF) merge.
	const counts = new Map<string, [label: string, count: number]>();
	for (const item of items) {
		const last = item.taxa.at(-1);
		const name = last && shortTaxon(last);
		if (!name) continue;
		const key = name.toLowerCase();
		const [label, n] = counts.get(key) ?? [name, 0];
		counts.set(key, [label, n + 1]);
	}
	const top = [...counts.values()].sort((a, b) => b[1] - a[1]).slice(0, 8);
	return (
		<Stack gap={4}>
			<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
				Táxons mais frequentes
			</Text>
			<Group gap={6}>
				{top.map(([name, n]) => (
					<Badge key={name} variant="outline" color="orange" tt="none">
						{name} · {n}
					</Badge>
				))}
			</Group>
		</Stack>
	);
}

function OccurrenceCard({ item }: { item: FossilOccurrence }) {
	return (
		<Paper withBorder p="sm" radius="md">
			<Stack gap={4}>
				<Group justify="space-between" wrap="nowrap" align="flex-start">
					<Text fw={600} size="sm">
						{item.taxa.join(" › ")}
					</Text>
					<Group gap={4} wrap="nowrap">
						{item.typeStatus && (
							<Badge size="xs" color="red" variant="light">
								{item.typeStatus}
							</Badge>
						)}
						<Badge size="xs" variant="default">
							{FOSSIL_SOURCE_LABELS[item.source]}
						</Badge>
					</Group>
				</Group>
				{(item.unit || item.age) && (
					<Text size="xs">
						{[item.unit, item.age].filter(Boolean).join(" · ")}
					</Text>
				)}
				<Text size="xs" c="dimmed">
					{[
						item.specimen,
						item.institution,
						item.locality,
						`${item.distanceKm} km`,
						item.license,
					]
						.filter(Boolean)
						.join(" · ")}
				</Text>
				{item.reference && (
					<Text size="xs" c="dimmed" lineClamp={2} fs="italic">
						{item.reference}
					</Text>
				)}
				{item.url && (
					<Anchor href={item.url} target="_blank" rel="noreferrer" size="xs">
						Ver registro <ArrowSquareOut size={12} />
					</Anchor>
				)}
			</Stack>
		</Paper>
	);
}
