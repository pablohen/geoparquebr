import { Anchor, Group, Text } from "@mantine/core";
import { Mountains } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { MyGeositesLink } from "~/features/my-geosites/components/MyGeositesLink";
import { SITE_NAME } from "~/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";

/** Logo (back to the map) and language menu, for the standalone pages. */
export function PageHeader() {
	return (
		<Group justify="space-between" mb="lg">
			<Anchor component={Link} to="/" underline="never" c="inherit">
				<Group gap={6}>
					<Mountains
						size={22}
						weight="duotone"
						color="var(--mantine-primary-color-filled)"
						aria-hidden
					/>
					<Text fw={700}>{SITE_NAME}</Text>
				</Group>
			</Anchor>
			<Group gap="xs">
				<MyGeositesLink />
				<LanguageSwitcher />
			</Group>
		</Group>
	);
}
