import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { FossilsIndex } from "~/features/fossils/components/FossilsIndex";
import { getFossilGenera } from "~/features/fossils/fossils.functions";
import {
	FOSSILS_INDEX_PATH,
	fossilsIndexMetaTags,
} from "~/features/fossils/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";

/** Fossil genera recorded near geosites, each linking to its own page. */
export const Route = createFileRoute("/fossils/")({
	loader: () => getFossilGenera(),
	head: () => ({
		meta: fossilsIndexMetaTags(),
		links: [
			{ rel: "canonical", href: absoluteUrl(FOSSILS_INDEX_PATH) },
			...alternateLinks(FOSSILS_INDEX_PATH, SITE_URL),
		],
	}),
	component: FossilsPage,
});

function FossilsPage() {
	const genera = Route.useLoaderData();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<FossilsIndex genera={genera} />
		</Container>
	);
}
