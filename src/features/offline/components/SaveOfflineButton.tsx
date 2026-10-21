import { Alert, Button, Progress, Stack, Text } from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { CloudArrowDown, CloudCheck, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { GEOPARKS, geoparkPath } from "~/features/geoparks/geoparks";
import type { GeoparkGeosite } from "~/features/geoparks/schemas";
import type { GeoparkId } from "~/features/geosites/schemas";
import { m } from "~/paraglide/messages.js";
import { getLocale, localizeHref } from "~/paraglide/runtime.js";
import { OfflineUnavailableError, saveGeoparkOffline } from "../download";
import { savedGeoparks } from "../store";

type Status =
	| { kind: "idle" }
	| { kind: "saving"; done: number; total: number }
	| { kind: "unavailable" }
	| { kind: "failed" };

/** Saves a geopark's pages, data, map and relief for use without signal. */
export function SaveOfflineButton({
	id,
	geosites,
}: {
	id: GeoparkId;
	geosites: GeoparkGeosite[];
}) {
	// What's saved lives in this browser; the server renders the idle button.
	const mounted = useMounted();
	const saved = savedGeoparks.use()[id];
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	const save = async () => {
		const { area } = GEOPARKS[id];
		// The exact URLs the app navigates to, in the current language.
		const pageUrls = [
			geoparkPath(id),
			"/geoparks",
			"/my-geosites",
			`/?bbox=${encodeURIComponent(JSON.stringify(area))}`,
			...geosites.map((g) => `/geosites/${g.slug}`),
		].map((path) => localizeHref(path));
		try {
			setStatus({ kind: "saving", done: 0, total: 1 });
			await saveGeoparkOffline(
				{ id, area: [...area], geosites, pageUrls },
				(done, total) => setStatus({ kind: "saving", done, total }),
			);
			setStatus({ kind: "idle" });
		} catch (err) {
			setStatus({
				kind: err instanceof OfflineUnavailableError ? "unavailable" : "failed",
			});
		}
	};

	if (status.kind === "saving")
		return (
			<Stack gap={6}>
				<Text size="sm">
					{m.offline_saving({ done: status.done, total: status.total })}
				</Text>
				<Progress value={(status.done / status.total) * 100} animated />
			</Stack>
		);

	const date =
		mounted && saved
			? new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(
					new Date(saved.savedAt),
				)
			: null;
	return (
		<Stack gap={6}>
			{date && (
				<Text size="sm" c="teal">
					<CloudCheck size={16} style={{ verticalAlign: "-3px" }} />{" "}
					{m.offline_saved_on({ date })}
				</Text>
			)}
			<Button
				variant="default"
				leftSection={<CloudArrowDown size={16} />}
				onClick={save}
				style={{ alignSelf: "flex-start" }}
			>
				{date ? m.offline_update() : m.offline_save()}
			</Button>
			<Text size="xs" c="dimmed">
				{m.offline_saved_detail()}
			</Text>
			{mounted && saved && saved.failed > 0 && (
				<Text size="xs" c="orange">
					{m.offline_partial({ count: saved.failed })}
				</Text>
			)}
			{status.kind !== "idle" && (
				<Alert color="orange" icon={<Warning />} p="xs">
					{status.kind === "unavailable"
						? m.offline_unavailable()
						: m.offline_failed()}
				</Alert>
			)}
		</Stack>
	);
}
