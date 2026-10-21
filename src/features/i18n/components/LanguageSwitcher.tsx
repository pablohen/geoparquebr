import { Button, Menu } from "@mantine/core";
import { Check, Translate } from "@phosphor-icons/react";
import { useLocation } from "@tanstack/react-router";
import { LOCALE_CODES, LOCALE_NAMES } from "~/lib/i18n";
import { m } from "~/paraglide/messages.js";
import { getLocale, locales, localizeHref } from "~/paraglide/runtime.js";

/**
 * The same page and search params in another language. Plain links, so the
 * page reloads and every message (including server-rendered ones) switches.
 */
export function LanguageSwitcher() {
	// The router's location is the internal, locale-free href.
	const { href } = useLocation();
	const current = getLocale();
	return (
		<Menu position="bottom-end" withinPortal>
			<Menu.Target>
				<Button
					variant="default"
					size="sm"
					px="xs"
					leftSection={<Translate size={16} />}
					// The accessible name must contain the visible code (WCAG 2.5.3).
					aria-label={`${m.language_menu_aria()}: ${LOCALE_CODES[current]}`}
					style={{ flex: "none" }}
				>
					{LOCALE_CODES[current]}
				</Button>
			</Menu.Target>
			<Menu.Dropdown>
				{locales.map((locale) => (
					<Menu.Item
						key={locale}
						component="a"
						href={localizeHref(href, { locale })}
						hrefLang={locale}
						lang={locale}
						rightSection={locale === current ? <Check size={14} /> : null}
					>
						{LOCALE_NAMES[locale]}
					</Menu.Item>
				))}
			</Menu.Dropdown>
		</Menu>
	);
}
