import {
	Anchor,
	Button,
	CopyButton,
	Modal,
	Stack,
	Text,
	Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Check, Code } from "@phosphor-icons/react";
import { absoluteUrl } from "~/lib/site";
import { m } from "~/paraglide/messages.js";
import { iframeSnippet } from "../embed";

type Props = {
	/** `/embed/...` path of the map. */
	path: string;
	/** What the map shows, for the iframe's title. */
	name: string;
	size?: "xs" | "sm";
};

/** "Incorporar": the `<iframe>` code for this map, ready to copy. */
export function EmbedButton({ path, name, size = "sm" }: Props) {
	const [opened, { open, close }] = useDisclosure(false);
	const src = absoluteUrl(path);
	const code = iframeSnippet(src, m.embed_iframe_title({ name }));
	return (
		<>
			<Button
				size={size}
				variant="default"
				leftSection={<Code size={size === "xs" ? 14 : 16} />}
				onClick={open}
			>
				{m.embed_button()}
			</Button>
			<Modal opened={opened} onClose={close} title={m.embed_title()} size="lg">
				<Stack gap="sm">
					<Text size="sm" c="dimmed">
						{m.embed_intro()}
					</Text>
					<Textarea
						value={code}
						readOnly
						autosize
						minRows={3}
						ff="monospace"
						aria-label={m.embed_title()}
						onFocus={(e) => e.currentTarget.select()}
					/>
					<CopyButton value={code} timeout={2000}>
						{({ copied, copy }) => (
							<Button
								onClick={copy}
								color={copied ? "teal" : undefined}
								leftSection={copied ? <Check size={16} /> : <Code size={16} />}
								style={{ alignSelf: "flex-start" }}
							>
								{copied ? m.embed_copied() : m.embed_copy()}
							</Button>
						)}
					</CopyButton>
					<Anchor href={src} target="_blank" rel="noopener" size="sm">
						{m.embed_preview()}
					</Anchor>
				</Stack>
			</Modal>
		</>
	);
}
