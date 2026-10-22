import { Anchor } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UfSchema } from "../schemas";

/** Links to a state's page; plain text for anything that isn't a state code. */
export function StateLink({
	uf,
	children = uf,
	size = "sm",
}: {
	uf: string;
	children?: ReactNode;
	size?: string;
}) {
	if (!UfSchema.safeParse(uf).success) return <>{children}</>;
	return (
		<Anchor
			size={size}
			inherit={size === "inherit"}
			renderRoot={(props) => (
				<Link {...props} to="/states/$uf" params={{ uf: uf.toLowerCase() }} />
			)}
		>
			{children}
		</Anchor>
	);
}
