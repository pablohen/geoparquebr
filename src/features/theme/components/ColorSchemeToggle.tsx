import {
	ActionIcon,
	useComputedColorScheme,
	useMantineColorScheme,
} from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { Moon, Sun } from "@phosphor-icons/react";
import { m } from "~/paraglide/messages.js";

/** Light/dark switch, in the map's header and every page's. */
export function ColorSchemeToggle() {
	const { setColorScheme } = useMantineColorScheme();
	const computed = useComputedColorScheme("light", {
		getInitialValueInEffect: true,
	});
	// The scheme comes from localStorage, which the server can't see: render
	// the light-mode button until mounted, as the server did.
	const mounted = useMounted();
	const dark = mounted && computed === "dark";
	const next = dark ? "light" : "dark";
	return (
		<ActionIcon
			variant="default"
			size="lg"
			onClick={() => setColorScheme(next)}
			aria-label={
				next === "dark" ? m.explorer_theme_dark() : m.explorer_theme_light()
			}
		>
			{dark ? <Sun size={18} /> : <Moon size={18} />}
		</ActionIcon>
	);
}
