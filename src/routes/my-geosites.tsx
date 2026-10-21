import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { MyGeositesView } from "~/features/my-geosites/components/MyGeositesView";
import { SITE_NAME } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** This device's favourites, visits and offline geoparks. Not indexed. */
export const Route = createFileRoute("/my-geosites")({
	head: () => ({
		meta: [
			{ title: `${m.my_title()} — ${SITE_NAME}` },
			{ name: "robots", content: "noindex" },
		],
	}),
	component: () => (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<MyGeositesView />
		</Container>
	),
});
