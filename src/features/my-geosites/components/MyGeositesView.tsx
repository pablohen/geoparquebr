import {
	Badge,
	Center,
	Group,
	Loader,
	NavLink,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { CaretRight, CheckCircle, Star } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { geoparkIdLabel } from "~/features/geosites/labels";
import type { GeoparkId } from "~/features/geosites/schemas";
import { savedGeoparks } from "~/features/offline/store";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import { type MyGeosite, useMyGeosites } from "../store";

const formatDate = (iso: string) =>
	new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(
		new Date(iso),
	);

/** "Meus geossítios": favourites, visits and offline geoparks on this device. */
export function MyGeositesView() {
	// Everything here lives in this browser; render it only once mounted.
	const mounted = useMounted();
	const { state } = useMyGeosites();
	const offline = savedGeoparks.use();
	if (!mounted)
		return (
			<Center py="xl">
				<Loader type="dots" />
			</Center>
		);

	const entries = Object.values(state);
	const favourites = entries
		.filter((e) => e.favourite)
		.sort((a, b) => a.name.localeCompare(b.name));
	const visited = entries
		.filter((e) => e.visitedAt)
		.sort((a, b) => (b.visitedAt ?? "").localeCompare(a.visitedAt ?? ""));
	const savedIds = Object.keys(offline) as GeoparkId[];

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.my_title()}
				</Title>
				<Text c="dimmed">{m.my_intro()}</Text>
			</Stack>

			<Section
				icon={<Star size={18} weight="fill" />}
				title={m.my_favourites()}
				empty={m.my_empty_favourites()}
				items={favourites}
			/>

			<Section
				icon={<CheckCircle size={18} weight="fill" />}
				title={m.my_visited()}
				aside={m.my_count({ count: visited.length })}
				empty={m.my_empty_visited()}
				items={visited}
				detail={(e) =>
					e.visitedAt && m.my_visited_on({ date: formatDate(e.visitedAt) })
				}
			/>

			{savedIds.length > 0 && (
				<Stack gap="xs">
					<Title order={2} size="h4">
						{m.offline_saved_geoparks()}
					</Title>
					<Stack gap={2} mx="-sm">
						{savedIds.map((id) => (
							<NavLink
								key={id}
								renderRoot={(props) => (
									<Link
										{...props}
										to="/geoparks/$geoparkId"
										params={{ geoparkId: id }}
									/>
								)}
								label={
									<Text fw={600} size="sm">
										{geoparkIdLabel(id)}
									</Text>
								}
								description={m.offline_saved_on({
									date: formatDate(offline[id]?.savedAt ?? ""),
								})}
								rightSection={<CaretRight size={14} />}
								styles={{ root: { borderRadius: "var(--mantine-radius-md)" } }}
							/>
						))}
					</Stack>
				</Stack>
			)}
		</Stack>
	);
}

function Section({
	icon,
	title,
	aside,
	empty,
	items,
	detail,
}: {
	icon: ReactNode;
	title: string;
	aside?: string;
	empty: string;
	items: MyGeosite[];
	detail?: (e: MyGeosite) => ReactNode;
}) {
	return (
		<Stack gap="xs">
			<Group justify="space-between" align="baseline">
				<Group gap={8}>
					{icon}
					<Title order={2} size="h4">
						{title}
					</Title>
				</Group>
				{aside && (
					<Text size="sm" c="dimmed">
						{aside}
					</Text>
				)}
			</Group>
			{items.length === 0 ? (
				<Text size="sm" c="dimmed">
					{empty}
				</Text>
			) : (
				<Stack gap={2} mx="-sm">
					{items.map((e) => (
						<NavLink
							key={e.slug}
							renderRoot={(props) => (
								<Link
									{...props}
									to="/geosites/$slug"
									params={{ slug: e.slug }}
								/>
							)}
							label={
								<Text fw={600} size="sm">
									{e.name}
								</Text>
							}
							description={
								<Group gap={6} mt={2}>
									<Text size="xs" c="dimmed">
										{e.municipality} – {e.state}
									</Text>
									{e.geoparkId && (
										<Badge size="xs" variant="light">
											{geoparkIdLabel(e.geoparkId)}
										</Badge>
									)}
									{detail && (
										<Text size="xs" c="dimmed">
											{detail(e)}
										</Text>
									)}
								</Group>
							}
							rightSection={<CaretRight size={14} />}
							styles={{ root: { borderRadius: "var(--mantine-radius-md)" } }}
						/>
					))}
				</Stack>
			)}
		</Stack>
	);
}
