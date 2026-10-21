import { createFileRoute } from "@tanstack/react-router";
import { geositePath } from "~/features/geosites/seo";
import { newsFeedXml } from "~/features/news/feed";
import { changeFieldLabel, formatRunDate } from "~/features/news/labels";
import { NEWS_PATH } from "~/features/news/schemas";
import { getLocale } from "~/lib/i18n";
import { absoluteUrl } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** RSS for "Novidades", in the language of the URL (`/en/news.xml`). */
export const Route = createFileRoute("/news.xml")({
	server: {
		handlers: {
			GET: async () => {
				// Loaded lazily so the Mongo driver stays out of the client graph.
				const { listChanges } = await import("~/features/news/news.server");
				const locale = getLocale();
				const xml = newsFeedXml(await listChanges(), {
					title: m.news_title(),
					description: m.news_intro(),
					language: locale,
					link: absoluteUrl(NEWS_PATH),
					geositeUrl: (slug) => absoluteUrl(geositePath(slug)),
					runTitle: (run) =>
						m.news_run_title({ date: formatRunDate(run.at, locale) }),
					added: (count) => m.news_added_title({ count }),
					changed: (count) => m.news_changed_title({ count }),
					removed: (count) => m.news_removed_title({ count }),
					fieldLabel: changeFieldLabel,
				});
				return new Response(xml, {
					headers: {
						"Content-Type": "application/rss+xml; charset=utf-8",
						"Cache-Control": "public, max-age=0, s-maxage=3600",
					},
				});
			},
		},
	},
});
