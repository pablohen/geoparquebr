import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { pageMetaTags } from "~/features/geoparks/seo";
import { PageHeader } from "~/features/i18n/components/PageHeader";
import { pageCardPath } from "~/features/share/card-response";
import { UnitsIndex } from "~/features/units/components/UnitsIndex";
import { UNITS_PATH } from "~/features/units/units";
import { getUnits } from "~/features/units/units.functions";
import { alternateLinks } from "~/lib/i18n";
import { absoluteUrl, SITE_URL } from "~/lib/site";
import { m } from "~/paraglide/messages.js";

/** Rock units mapped at geosites; the name filter lives in the URL. */
export const Route = createFileRoute("/units/")({
	validateSearch: z.object({
		q: z.string().trim().max(60).optional().catch(undefined),
	}),
	loader: () => getUnits(),
	head: () => ({
		meta: pageMetaTags(
			m.units_title(),
			m.units_intro(),
			UNITS_PATH,
			absoluteUrl(pageCardPath("units")),
		),
		links: [
			{ rel: "canonical", href: absoluteUrl(UNITS_PATH) },
			...alternateLinks(UNITS_PATH, SITE_URL),
		],
	}),
	component: UnitsPage,
});

function UnitsPage() {
	const units = Route.useLoaderData();
	const { q } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<Container component="main" size="md" px={{ base: "sm", sm: "md" }} py="md">
			<PageHeader />
			<UnitsIndex
				units={units}
				q={q}
				onQueryChange={(next) =>
					navigate({ search: { q: next }, replace: true, resetScroll: false })
				}
			/>
		</Container>
	);
}
