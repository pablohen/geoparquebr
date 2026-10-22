import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import {
	COMPARE_GEOSITES_PATH,
	CompareSearchSchema,
} from "~/features/compare/compare";
import {
	GeositeCompareView,
	type Side,
} from "~/features/compare/components/GeositeCompareView";
import { getGeositeGenera } from "~/features/fossils/fossils.functions";
import { pageMetaTags } from "~/features/geoparks/seo";
import { getGeositeBySlug } from "~/features/geosites/geosites.functions";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { absoluteUrl } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** One side: the geosite and its nearby genera, or null if it doesn't exist. */
async function loadSide(slug: string | undefined): Promise<Side> {
	if (!slug) return null;
	try {
		const [geosite, genera] = await Promise.all([
			getGeositeBySlug({ data: { slug } }),
			getGeositeGenera({ data: { slug } }),
		]);
		return { geosite, genera };
	} catch {
		return null;
	}
}

/** Two geosites side by side (`?a=&b=`); not indexed, it varies per pair. */
export const Route = createFileRoute("/compare")({
	validateSearch: CompareSearchSchema,
	loaderDeps: ({ search: { a, b } }) => ({ a, b }),
	loader: async ({ deps }) => {
		const [a, b] = await Promise.all([loadSide(deps.a), loadSide(deps.b)]);
		return { a, b };
	},
	head: () => ({
		meta: [
			...pageMetaTags(m.cmp_title(), m.cmp_intro(), COMPARE_GEOSITES_PATH),
			{ name: "robots", content: "noindex" },
		],
		links: [{ rel: "canonical", href: absoluteUrl(COMPARE_GEOSITES_PATH) }],
	}),
	component: ComparePage,
});

function ComparePage() {
	const { a, b } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<GeositeCompareView
				search={search}
				a={a}
				b={b}
				onSearchChange={(next) =>
					navigate({ search: next, replace: true, resetScroll: false })
				}
			/>
		</Container>
	);
}
