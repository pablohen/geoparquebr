import {
	Anchor,
	CloseButton,
	Group,
	Loader,
	Paper,
	Stack,
	Text,
} from "@mantine/core";
import { MINERALS_SERVICE } from "~/features/geosites/overlays";
import { useServerQuery } from "~/lib/use-server-query";
import { m } from "~/paraglide/messages.js";
import { getMineralsAt } from "../geology.functions";
import type { MineralOccurrence } from "../schemas";

type Props = {
	point: [number, number];
	/** Map zoom at the tap, for the tap tolerance. */
	zoom: number;
	onClose: () => void;
};

/** About 12 screen pixels at `zoom`, in degrees: a fingertip around the tap. */
export const tapRadiusDeg = (zoom: number) =>
	Math.min(0.2, Math.max(0.0001, (12 * 360) / (512 * 2 ** zoom)));

/** SGB mineral occurrences near a tap, nearest first (the explorer places it). */
export function MineralsAtPointCard({
	point: [lng, lat],
	zoom,
	onClose,
}: Props) {
	const radiusDeg = tapRadiusDeg(zoom);
	const result = useServerQuery(
		`minerals-at:${lng.toFixed(4)},${lat.toFixed(4)}:${radiusDeg.toPrecision(2)}`,
		() => getMineralsAt({ data: { lng, lat, radiusDeg } }),
	);
	const data = result.data;

	return (
		<Paper p="sm" radius="md" shadow="md">
			<Group justify="space-between" align="flex-start" wrap="nowrap" mb={4}>
				<Text size="xs" fw={600}>
					{m.minerals_at_title()}
				</Text>
				<CloseButton
					size="sm"
					onClick={onClose}
					aria-label={m.common_close()}
				/>
			</Group>
			{result.status === "pending" ? (
				<Loader size="sm" type="dots" />
			) : data?.status === "ok" && data.items.length > 0 ? (
				<Stack gap="xs">
					{data.items.map((o) => (
						<Occurrence key={o.id} occurrence={o} />
					))}
					{data.total > data.items.length && (
						<Text size="xs" c="dimmed">
							{m.minerals_at_more({ count: data.total - data.items.length })}
						</Text>
					)}
					<Anchor
						href={`${MINERALS_SERVICE}/0`}
						target="_blank"
						rel="noreferrer"
						size="xs"
					>
						{m.minerals_at_source()}
					</Anchor>
				</Stack>
			) : (
				<Text size="sm" c="dimmed">
					{data?.status === "unavailable" || result.status === "error"
						? m.minerals_at_unavailable()
						: m.minerals_at_none()}
				</Text>
			)}
		</Paper>
	);
}

function Occurrence({ occurrence: o }: { occurrence: MineralOccurrence }) {
	const place = [o.municipality, o.state].filter(Boolean).join(" – ");
	return (
		<Stack gap={2}>
			<Text size="sm" fw={600}>
				{o.substances ?? o.name}
				{o.substances && o.name && (
					<Text span size="xs" c="dimmed" fw={400}>
						{" "}
						· {o.name}
					</Text>
				)}
			</Text>
			<Text size="xs">
				{[o.status, o.activity, o.importance, o.useClass]
					.filter(Boolean)
					.join(" · ")}
			</Text>
			<Text size="xs" c="dimmed">
				{[place, o.province && m.minerals_at_province({ province: o.province })]
					.filter(Boolean)
					.join(" · ")}
				{" · "}
				{m.minerals_at_distance({ meters: o.distanceM })}
			</Text>
			{o.hostRocks && (
				<Text size="xs" c="dimmed" lineClamp={2}>
					{m.minerals_at_host({ rocks: o.hostRocks })}
				</Text>
			)}
		</Stack>
	);
}
