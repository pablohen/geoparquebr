import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { NewsView } from "~/features/news/components/NewsView";
import { getChanges } from "~/features/news/news.functions";
import { NEWS_FEED_PATH, NEWS_PATH } from "~/features/news/schemas";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** "Novidades": what each weekly GEOSSIT sync added, changed or removed. */
export const Route = createFileRoute("/news")({
	loader: () => getChanges(),
	head: () => ({
		meta: pageMetaTags(m.news_title(), m.news_intro(), NEWS_PATH),
		links: [
			{ rel: "canonical", href: absoluteUrl(NEWS_PATH) },
			...alternateLinks(NEWS_PATH, SITE_URL),
			{
				rel: "alternate",
				type: "application/rss+xml",
				title: m.news_title(),
				href: absoluteUrl(NEWS_FEED_PATH),
			},
		],
	}),
	component: NewsPage,
});

function NewsPage() {
	const runs = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<NewsView runs={runs} />
		</Container>
	);
}
