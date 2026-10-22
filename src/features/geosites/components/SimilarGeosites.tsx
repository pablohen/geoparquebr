import { Badge, Group, Loader, NavLink, Stack, Text } from "@mantine/core";
import { CaretRight } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { periodLabel } from "~/features/geology/labels";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { getSimilarGeosites } from "../geosites.functions";
import { categoryLabel } from "../labels";
import type { SimilarMatch } from "../similar";
import { CATEGORY_COLORS } from "./categoryStyle";

type Props = {
	slug: string;
	/** In the map drawer: open the geosite there. Without it, link to its page. */
	onSelect?: (slug: string) => void;
};

/** "Parecidos": geosites elsewhere sharing this one's themes and periods. */
export function SimilarGeosites({ slug, onSelect }: Props) {
	const query = useServerQuery(`similar:${slug}`, () =>
		getSimilarGeosites({ data: { slug } }),
	);

	let body: ReactNode;
	if (query.status === "error")
		body = (
			<Text size="sm" c="dimmed">
				{m.similar_error()}
			</Text>
		);
	else if (query.status !== "success") body = <Loader size="sm" type="dots" />;
	else if (query.data.length === 0)
		body = (
			<Text size="sm" c="dimmed">
				{m.similar_none()}
			</Text>
		);
	else
		body = (
			<Stack gap={2} mx="-sm">
				{query.data.map((g) => (
					<SimilarItem key={g.slug} geosite={g} onSelect={onSelect} />
				))}
			</Stack>
		);

	return (
		<Stack gap={6}>
			<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
				{m.similar_title()}
			</Text>
			{body}
		</Stack>
	);
}

function SimilarItem({
	geosite: g,
	onSelect,
}: {
	geosite: SimilarMatch;
	onSelect?: (slug: string) => void;
}) {
	const props = {
		label: (
			<Text size="sm" fw={600} lineClamp={1}>
				{g.name}
			</Text>
		),
		description: (
			<Stack gap={4} mt={2}>
				<Text size="xs" c="dimmed" lineClamp={1}>
					{g.municipality} – {g.state}
				</Text>
				<Group gap={4} aria-label={m.similar_shares()}>
					{g.categories.map((c) => (
						<Badge key={c} size="xs" variant="light" color={CATEGORY_COLORS[c]}>
							{categoryLabel(c)}
						</Badge>
					))}
					{g.periods.map((p) => (
						<Badge key={p} size="xs" variant="default">
							{periodLabel(p)}
						</Badge>
					))}
				</Group>
			</Stack>
		),
		rightSection: <CaretRight size={14} />,
		styles: { root: { borderRadius: "var(--mantine-radius-md)" } },
	};
	return onSelect ? (
		<NavLink {...props} component="button" onClick={() => onSelect(g.slug)} />
	) : (
		<NavLink
			{...props}
			renderRoot={(root) => (
				<Link {...root} to="/geosites/$slug" params={{ slug: g.slug }} />
			)}
		/>
	);
}
