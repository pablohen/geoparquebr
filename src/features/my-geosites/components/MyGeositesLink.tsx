import { ActionIcon, Tooltip } from "@mantine/core";
import { BookmarkSimple } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";

/** Header button to "Meus geossítios". */
export function MyGeositesLink() {
	return (
		<Tooltip label={m.my_title()} withinPortal>
			<ActionIcon
				variant="default"
				size="lg"
				aria-label={m.my_title()}
				renderRoot={(props) => <Link {...props} to="/my-geosites" />}
				style={{ flex: "none" }}
			>
				<BookmarkSimple size={18} />
			</ActionIcon>
		</Tooltip>
	);
}
