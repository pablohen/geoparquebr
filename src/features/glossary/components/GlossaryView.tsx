import { Anchor, Box, Group, Stack, Text, Title } from "@mantine/core";
import { Clock } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { m } from "~/paraglide/messages.js";
import { GLOSSARY } from "../glossary";

/** Plain-language definitions, one anchor per term for links from other pages. */
export function GlossaryView() {
	return (
		<Stack gap="xl">
			<Stack gap={6}>
				<Title order={1} size="h2">
					{m.glossary_title()}
				</Title>
				<Text c="dimmed">{m.glossary_intro()}</Text>
				<Group gap="md" component="nav" aria-label={m.glossary_title()}>
					{GLOSSARY.map((s) => (
						<Anchor key={s.id} href={`#${s.id}`} size="sm">
							{s.title()}
						</Anchor>
					))}
				</Group>
			</Stack>

			{GLOSSARY.map((section) => (
				<Stack key={section.id} gap="sm" component="section">
					<Title
						order={2}
						size="h4"
						id={section.id}
						style={{ scrollMarginTop: 16 }}
					>
						{section.title()}
					</Title>
					<Box component="dl" m={0}>
						{section.entries.map((e) => (
							<Box
								key={e.id}
								id={e.id}
								py="xs"
								style={{
									scrollMarginTop: 16,
									borderTop: "1px solid var(--mantine-color-default-border)",
								}}
							>
								<Text component="dt" fw={600}>
									{e.term()}
								</Text>
								<Text component="dd" m={0} size="sm">
									{e.definition()}
									{e.id === "period" && (
										<>
											{" "}
											<Anchor
												size="sm"
												renderRoot={(props) => (
													<Link {...props} to="/timeline" />
												)}
											>
												<Group gap={4} component="span" display="inline-flex">
													<Clock size={14} aria-hidden />
													{m.glossary_see_timeline()}
												</Group>
											</Anchor>
										</>
									)}
								</Text>
							</Box>
						))}
					</Box>
				</Stack>
			))}
		</Stack>
	);
}
