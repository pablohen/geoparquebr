import { Button } from "@mantine/core";
import { Translate } from "@phosphor-icons/react";
import { useLocation } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";
import { getLocale, localizeHref } from "~/paraglide/runtime.js";

/**
 * Same page and search params in the other language. A plain link, so the
 * page reloads and every message (including server-rendered ones) switches.
 */
export function LanguageSwitcher() {
	// The router's location is the internal, locale-free href.
	const { href } = useLocation();
	const other = getLocale() === "en" ? "pt-BR" : "en";
	return (
		<Button
			component="a"
			href={localizeHref(href, { locale: other })}
			hrefLang={other}
			variant="default"
			size="sm"
			px="xs"
			leftSection={<Translate size={16} />}
			aria-label={m.language_switch_aria()}
			style={{ flex: "none" }}
		>
			{m.language_switch_short()}
		</Button>
	);
}
