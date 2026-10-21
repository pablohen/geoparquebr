import {
	Anchor,
	Badge,
	Button,
	Group,
	NavLink,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import {
	ArrowLeft,
	CaretRight,
	CheckCircle,
	MapTrifold,
	Printer,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { GenusLinkList } from "~/features/fossils/components/GenusLinks";
import type { GenusLink } from "~/features/fossils/schemas";
import { CATEGORY_COLORS } from "~/features/geosites/components/categoryStyle";
import { categoryLabel, geoparkIdLabel } from "~/features/geosites/labels";
import type { GeoparkId } from "~/features/geosites/schemas";
import { VisitProgress } from "~/features/my-geosites/components/VisitProgress";
import { useMyGeosites } from "~/features/my-geosites/store";
import { SaveOfflineButton } from "~/features/offline/components/SaveOfflineButton";
import { GeoparkTripButton } from "~/features/trip/components/GeoparkTripButton";
import { m } from "~/paraglide/messages.js";
import { GEOPARKS } from "../geoparks";
import { geoparkAbout } from "../labels";
import type { GeoparkGeosite } from "../schemas";

type Props = {
	id: GeoparkId;
	geosites: GeoparkGeosite[];
	genera: GenusLink[];
};

/** One geopark: what it is, its GEOSSIT geosites and a way onto the map. */
export function GeoparkView({ id, geosites, genera }: Props) {
	const { designated, area } = GEOPARKS[id];
	// Device data: empty during SSR and hydration, filled in after.
	const { state } = useMyGeosites();
	const visited = geosites.filter((g) => state[g.slug]?.visitedAt).length;
	return (
		<Stack gap="lg">
			<Anchor
				renderRoot={(props) => <Link {...props} to="/geoparks/" />}
				size="sm"
			>
				<Group gap={4}>
					<ArrowLeft size={14} />
					{m.geopark_all_geoparks()}
				</Group>
			</Anchor>

			<Stack gap={6}>
				<Title order={1} size="h2">
					{geoparkIdLabel(id)}
				</Title>
				<Text c="dimmed" size="sm">
					{m.geopark_designated({ year: designated })}
				</Text>
				<Text>{geoparkAbout(id)}</Text>
			</Stack>

			<Group gap="xs">
				<Button
					renderRoot={(props) => (
						<Link {...props} to="/" search={{ bbox: [...area] }} />
					)}
					variant="light"
					leftSection={<MapTrifold size={16} />}
				>
					{m.geopark_view_map()}
				</Button>
				{geosites.length > 0 && (
					<>
						<GeoparkTripButton id={id} geosites={geosites} />
						<Button
							renderRoot={(props) => (
								<Link
									{...props}
									to="/geoparks/$geoparkId/guide"
									params={{ geoparkId: id }}
								/>
							)}
							variant="default"
							leftSection={<Printer size={16} />}
						>
							{m.guide_open()}
						</Button>
					</>
				)}
			</Group>

			<Stack gap="xs">
				<Title order={2} size="h4">
					{m.offline_title()}
				</Title>
				<SaveOfflineButton id={id} geosites={geosites} />
			</Stack>

			<Stack gap="xs">
				<Group justify="space-between" align="baseline">
					<Title order={2} size="h4">
						{m.geopark_geosites_title()}
					</Title>
					<Text size="sm" c="dimmed">
						{m.geopark_geosites_count({ count: geosites.length })}
					</Text>
				</Group>
				{visited > 0 && (
					<VisitProgress visited={visited} total={geosites.length} />
				)}
				{geosites.length === 0 ? (
					<Text c="dimmed" size="sm">
						{m.geopark_no_geosites()}
					</Text>
				) : (
					<Stack gap={2} mx="-sm">
						{geosites.map((g) => (
							<NavLink
								key={g.id}
								renderRoot={(props) => (
									<Link
										{...props}
										to="/geosites/$slug"
										params={{ slug: g.slug }}
									/>
								)}
								label={
									<Text fw={600} size="sm">
										{g.name}
									</Text>
								}
								description={
									<Group gap={6} mt={2}>
										<Text size="xs" c="dimmed">
											{g.municipality} – {g.state}
										</Text>
										{g.categories.map((c) => (
											<Badge
												key={c}
												size="xs"
												variant="light"
												color={CATEGORY_COLORS[c]}
											>
												{categoryLabel(c)}
											</Badge>
										))}
									</Group>
								}
								rightSection={
									<Group gap={6} wrap="nowrap">
										{state[g.slug]?.visitedAt && (
											<CheckCircle
												size={16}
												weight="fill"
												color="var(--mantine-color-teal-6)"
												aria-label={m.my_visited_label()}
											/>
										)}
										<CaretRight size={14} />
									</Group>
								}
								styles={{ root: { borderRadius: "var(--mantine-radius-md)" } }}
							/>
						))}
					</Stack>
				)}
				<Text size="xs" c="dimmed">
					{m.geopark_source_note()}
				</Text>
			</Stack>

			{genera.length > 0 && (
				<Stack gap="xs">
					<Title order={2} size="h4">
						{m.fossils_geopark_title()}
					</Title>
					<GenusLinkList genera={genera} />
				</Stack>
			)}
		</Stack>
	);
}
