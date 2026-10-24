import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

/**
 * TanStack's devtools (Router and Query panels in one launcher). Dev only:
 * `__root.tsx` loads this lazily behind `import.meta.env.DEV`, so it and its
 * devDependencies stay out of the production bundle.
 */
export default function Devtools() {
	return (
		<TanStackDevtools
			config={{ position: "bottom-right" }}
			plugins={[
				{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
				{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
			]}
		/>
	);
}
