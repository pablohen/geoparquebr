import { Anchor, Badge, Group, List, Stack, Text, Title } from "@mantine/core";
import { Rss } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { absoluteUrl } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import { getLocale } from "~/paraglide/runtime.js";
import { changeFieldLabel, formatRunDate } from "../labels";
import { type ChangeRun, NEWS_FEED_PATH } from "../schemas";

/** Each GEOSSIT sync that changed something, newest first. */
export function NewsView({ runs }: { runs: ChangeRun[] }) {
	return (
		<Stack gap="lg">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.news_title()}
				</Title>
				<Text c="dimmed">{m.news_intro()}</Text>
				<Anchor
					href={absoluteUrl(NEWS_FEED_PATH)}
					size="sm"
					style={{ alignSelf: "flex-start" }}
				>
					<Group gap={4}>
						<Rss size={14} />
						{m.news_feed()}
					</Group>
				</Anchor>
			</Stack>

			{runs.length === 0 && <Text c="dimmed">{m.news_empty()}</Text>}

			{runs.map((run) => (
				<Stack key={run.id} id={run.id} gap="sm">
					<Title order={2} size="h4">
						{m.news_run_title({ date: formatRunDate(run.at, getLocale()) })}
					</Title>
					{run.added.length > 0 && (
						<Section title={m.news_added_title({ count: run.added.length })}>
							{run.added.map((g) => (
								<List.Item key={g.slug}>
									<GeositeLink slug={g.slug} name={g.name} />
								</List.Item>
							))}
						</Section>
					)}
					{run.changed.length > 0 && (
						<Section
							title={m.news_changed_title({ count: run.changed.length })}
						>
							{run.changed.map((g) => (
								<List.Item key={g.slug}>
									<GeositeLink slug={g.slug} name={g.name} />{" "}
									<Group gap={4} component="span" display="inline-flex">
										{g.fields.map((f) => (
											<Badge key={f} size="xs" variant="default" tt="none">
												{changeFieldLabel(f)}
											</Badge>
										))}
									</Group>
								</List.Item>
							))}
						</Section>
					)}
					{run.removed.length > 0 && (
						<Section
							title={m.news_removed_title({ count: run.removed.length })}
						>
							{run.removed.map((g) => (
								<List.Item key={g.name}>
									<Text size="sm" c="dimmed" span>
										{g.name}
									</Text>
								</List.Item>
							))}
						</Section>
					)}
				</Stack>
			))}
		</Stack>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Stack gap={4}>
			<Text size="xs" c="dimmed" tt="uppercase" fw={600}>
				{title}
			</Text>
			<List size="sm" spacing={4}>
				{children}
			</List>
		</Stack>
	);
}

function GeositeLink({ slug, name }: { slug: string; name: string }) {
	return (
		<Anchor
			size="sm"
			renderRoot={(props) => (
				<Link {...props} to="/geosites/$slug" params={{ slug }} />
			)}
		>
			{name}
		</Anchor>
	);
}
