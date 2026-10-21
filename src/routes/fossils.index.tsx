import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { FossilsIndex } from "~/features/fossils/components/FossilsIndex";
import { getFossilGenera } from "~/features/fossils/fossils.functions";
import { FossilsSearchSchema } from "~/features/fossils/schemas";
import {
	FOSSILS_INDEX_PATH,
	fossilsIndexMetaTags,
} from "~/features/fossils/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";

/** Fossil genera recorded near geosites, each linking to its own page. */
export const Route = createFileRoute("/fossils/")({
	validateSearch: FossilsSearchSchema,
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
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<FossilsIndex
				genera={genera}
				search={search}
				// Typing in the name filter shouldn't flood history.
				onSearchChange={(next) =>
					navigate({ search: next, replace: true, resetScroll: false })
				}
			/>
		</Container>
	);
}
