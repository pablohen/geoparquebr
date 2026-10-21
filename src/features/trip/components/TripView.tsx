import {
	ActionIcon,
	Alert,
	Badge,
	Button,
	Center,
	Group,
	Loader,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import {
	ArrowDown,
	ArrowSquareOut,
	ArrowUp,
	Crosshair,
	ListNumbers,
	Printer,
	Trash,
	X,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatDistance } from "~/features/geosites/components/categoryStyle";
import { ShareButton } from "~/features/geosites/components/ShareButton";
import { geoparkIdLabel } from "~/features/geosites/labels";
import { absoluteUrl } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import {
	googleMapsTripUrls,
	legMeters,
	pathMeters,
	suggestOrder,
} from "../route";
import type { TripStop } from "../schemas";
import { useTrip } from "../store";

type Point = [number, number];

/** This device's trip: order, distances and links out to Google Maps. */
export function TripView() {
	// The trip lives in this browser; render it only once mounted.
	const mounted = useMounted();
	const { trip, move, remove, replace, clear } = useTrip();
	const [start, setStart] = useState<Point>();
	const [locating, setLocating] = useState(false);
	const [locationError, setLocationError] = useState(false);

	if (!mounted)
		return (
			<Center py="xl">
				<Loader type="dots" />
			</Center>
		);

	const points = trip.map((s) => s.point);
	const legs = legMeters(points, start);
	const mapsUrls = googleMapsTripUrls(points, start);

	const locate = () => {
		setLocating(true);
		setLocationError(false);
		// The position stays in this page; it is never sent anywhere but Google Maps links.
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setStart([pos.coords.longitude, pos.coords.latitude]);
				setLocating(false);
			},
			() => {
				setLocationError(true);
				setLocating(false);
			},
			{ timeout: 10_000, maximumAge: 300_000 },
		);
	};

	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.trip_title()}
				</Title>
				<Text c="dimmed">{m.trip_intro()}</Text>
			</Stack>

			{trip.length === 0 ? (
				<Text c="dimmed">{m.trip_empty()}</Text>
			) : (
				<>
					<Group gap="xs">
						<Button
							size="xs"
							variant="default"
							leftSection={<ListNumbers size={14} />}
							disabled={trip.length < 2}
							onClick={() =>
								replace(
									suggestOrder(points, start).map((i) => trip[i] as TripStop),
								)
							}
						>
							{m.trip_suggest_order()}
						</Button>
						<Button
							size="xs"
							variant={start ? "light" : "default"}
							leftSection={<Crosshair size={14} />}
							loading={locating}
							onClick={start ? () => setStart(undefined) : locate}
						>
							{start ? m.trip_from_here_on() : m.trip_from_here()}
						</Button>
						<Button
							size="xs"
							variant="default"
							leftSection={<Printer size={14} />}
							renderRoot={(props) => <Link {...props} to="/trip/guide" />}
						>
							{m.guide_open()}
						</Button>
						<ShareButton
							url={absoluteUrl(
								`/trip?stops=${trip.map((s) => s.slug).join(",")}`,
							)}
							title={m.trip_share_title()}
						/>
						<Button
							size="xs"
							variant="subtle"
							color="red"
							leftSection={<Trash size={14} />}
							onClick={clear}
						>
							{m.trip_clear()}
						</Button>
					</Group>
					{locationError && (
						<Alert color="yellow" p="xs">
							{m.trip_location_error()}
						</Alert>
					)}

					<Stack gap="xs">
						{trip.map((stop, i) => (
							<StopRow
								key={stop.slug}
								stop={stop}
								index={i}
								last={i === trip.length - 1}
								legMeters={i > 0 || start ? legs[i] : undefined}
								approximateLeg={stop.approximate || !!trip[i - 1]?.approximate}
								onMove={(by) => move(i, by)}
								onRemove={() => remove(stop.slug)}
							/>
						))}
					</Stack>

					<Text size="sm" c="dimmed">
						{m.trip_stops_count({ count: trip.length })} ·{" "}
						{m.trip_total({
							distance: formatDistance(pathMeters(points, start)),
						})}
					</Text>

					<Group gap="xs">
						{mapsUrls.map((url, i) => (
							<Button
								key={url}
								component="a"
								href={url}
								target="_blank"
								rel="noreferrer"
								rightSection={<ArrowSquareOut size={16} />}
							>
								{mapsUrls.length === 1
									? m.trip_open_maps()
									: m.trip_open_maps_part({
											part: i + 1,
											total: mapsUrls.length,
										})}
							</Button>
						))}
					</Group>

					{trip.some((s) => s.approximate) && (
						<Text size="xs" c="dimmed">
							{m.trip_approximate_note()}
						</Text>
					)}
				</>
			)}
		</Stack>
	);
}

function StopRow({
	stop,
	index,
	last,
	legMeters,
	approximateLeg,
	onMove,
	onRemove,
}: {
	stop: TripStop;
	index: number;
	last: boolean;
	legMeters: number | undefined;
	approximateLeg: boolean;
	onMove: (by: -1 | 1) => void;
	onRemove: () => void;
}) {
	return (
		<Paper withBorder radius="md" p="xs">
			<Group gap="sm" wrap="nowrap" align="center">
				<Badge variant="light" size="lg" circle style={{ flex: "none" }}>
					{index + 1}
				</Badge>
				<Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
					<Text
						fw={600}
						size="sm"
						lineClamp={1}
						renderRoot={(props) => (
							<Link
								{...props}
								to="/geosites/$slug"
								params={{ slug: stop.slug }}
							/>
						)}
						c="inherit"
						td="none"
					>
						{stop.name}
					</Text>
					<Group gap={6}>
						{legMeters !== undefined && (
							<Text size="xs" c="dimmed" ff="monospace">
								{approximateLeg && "~"}+{formatDistance(legMeters)}
							</Text>
						)}
						<Text size="xs" c="dimmed">
							{stop.municipality} – {stop.state}
						</Text>
						{stop.geoparkId && (
							<Badge size="xs" variant="light">
								{geoparkIdLabel(stop.geoparkId)}
							</Badge>
						)}
					</Group>
				</Stack>
				<Group gap={4} wrap="nowrap" style={{ flex: "none" }}>
					<ActionIcon
						variant="subtle"
						color="gray"
						aria-label={m.trip_move_up({ name: stop.name })}
						disabled={index === 0}
						onClick={() => onMove(-1)}
					>
						<ArrowUp size={16} />
					</ActionIcon>
					<ActionIcon
						variant="subtle"
						color="gray"
						aria-label={m.trip_move_down({ name: stop.name })}
						disabled={last}
						onClick={() => onMove(1)}
					>
						<ArrowDown size={16} />
					</ActionIcon>
					<ActionIcon
						variant="subtle"
						color="gray"
						aria-label={m.trip_remove_stop({ name: stop.name })}
						onClick={onRemove}
					>
						<X size={16} />
					</ActionIcon>
				</Group>
			</Group>
		</Paper>
	);
}
