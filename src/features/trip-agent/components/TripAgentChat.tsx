import {
	ActionIcon,
	Alert,
	Box,
	Button,
	Group,
	Loader,
	Paper,
	ScrollArea,
	Stack,
	Text,
	Textarea,
	Tooltip,
} from "@mantine/core";
import {
	ArrowClockwise,
	PaperPlaneRight,
	StopCircle,
	Warning,
} from "@phosphor-icons/react";
import type { EveMessage, EveToolPart } from "eve/react";
import { useEveAgent } from "eve/react";
import { useEffect, useRef, useState } from "react";
import { getLocale } from "~/lib/i18n";
import { m } from "~/paraglide/messages.js";
import { TripProposalSchema } from "../schemas";
import { TripProposalCard } from "./TripProposalCard";

/** What a tool call shows while it runs, in the page's language. */
function toolLabel(name: string): string {
	switch (name) {
		case "search_geosites":
			return m.agent_tool_search_geosites();
		case "get_geosite":
			return m.agent_tool_get_geosite();
		case "nearby_geosites":
			return m.agent_tool_nearby_geosites();
		case "suggest_itineraries":
			return m.agent_tool_suggest_itineraries();
		case "propose_trip":
			return m.agent_tool_propose_trip();
		default:
			return m.agent_tool_other();
	}
}

function ToolActivity({
	part,
	onNavigate,
}: {
	part: EveToolPart;
	onNavigate: () => void;
}) {
	if (part.hidden || part.kind === "control") return null;
	if (part.name === "propose_trip" && part.state === "completed") {
		const proposal = TripProposalSchema.safeParse(part.output);
		if (proposal.success)
			return <TripProposalCard proposal={proposal.data} onOpen={onNavigate} />;
	}
	const running = part.state !== "completed" && part.state !== "failed";
	return (
		<Group gap={6} c="dimmed">
			{running && <Loader size={12} />}
			<Text size="xs" c="dimmed">
				{toolLabel(part.name)}
			</Text>
		</Group>
	);
}

function Message({
	message,
	onNavigate,
}: {
	message: EveMessage;
	onNavigate: () => void;
}) {
	const mine = message.role === "user";
	return (
		<Stack gap={6} align={mine ? "flex-end" : "stretch"}>
			{message.parts.map((part, i) => {
				const key = ("id" in part && part.id) || `${message.id}:${i}`;
				if (part.type === "text")
					return mine ? (
						<Paper
							key={key}
							px="sm"
							py={6}
							radius="md"
							bg="var(--mantine-primary-color-light)"
							maw="85%"
						>
							<Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
								{part.text}
							</Text>
						</Paper>
					) : (
						<Text key={key} size="sm" style={{ whiteSpace: "pre-wrap" }}>
							{part.text}
						</Text>
					);
				if (part.type === "tool")
					return (
						<ToolActivity
							key={part.callId}
							part={part}
							onNavigate={onNavigate}
						/>
					);
				return null;
			})}
		</Stack>
	);
}

/**
 * The trip planner: a chat with the eve agent in agent/. Session-only: the
 * conversation lives on eve's side for this session, nothing on the device.
 */
export default function TripAgentChat({
	onNavigate,
}: {
	/** Called when a link leaves the chat, to close the drawer. */
	onNavigate: () => void;
}) {
	const agent = useEveAgent({
		prepareSend: (input) => ({
			...input,
			clientContext: { locale: getLocale() },
		}),
	});
	const [draft, setDraft] = useState("");
	const viewport = useRef<HTMLDivElement>(null);
	const busy = agent.status === "busy";
	const disabled = agent.status === "resuming";

	// Follow the conversation as it streams: a new array on every update.
	const { messages } = agent;
	useEffect(() => {
		if (messages.length === 0) return;
		const el = viewport.current;
		if (el) el.scrollTo({ top: el.scrollHeight });
	}, [messages]);

	const send = (text: string) => {
		const message = text.trim();
		if (!message || disabled) return;
		setDraft("");
		void agent.send(message);
	};

	const examples = [
		m.agent_example_1(),
		m.agent_example_2(),
		m.agent_example_3(),
	];

	return (
		<Stack gap="sm" flex={1} mih={0} w="100%">
			<ScrollArea flex={1} viewportRef={viewport} type="auto" offsetScrollbars>
				{agent.messages.length === 0 ? (
					<Stack gap="sm">
						<Text size="sm">{m.agent_intro()}</Text>
						{examples.map((example) => (
							<Button
								key={example}
								variant="default"
								size="xs"
								justify="flex-start"
								styles={{ label: { whiteSpace: "normal", textAlign: "left" } }}
								h="auto"
								py={6}
								onClick={() => send(example)}
							>
								{example}
							</Button>
						))}
					</Stack>
				) : (
					<Stack gap="md" pb="xs">
						{agent.messages.map((message) => (
							<Message
								key={message.id}
								message={message}
								onNavigate={onNavigate}
							/>
						))}
						{busy && agent.messages.at(-1)?.role === "user" && (
							<Group gap={6}>
								<Loader size={12} />
								<Text size="xs" c="dimmed">
									{m.agent_thinking()}
								</Text>
							</Group>
						)}
					</Stack>
				)}
			</ScrollArea>

			{agent.error && (
				<Alert color="red" icon={<Warning size={16} />} py="xs">
					{m.agent_error()}
				</Alert>
			)}

			<form
				onSubmit={(event) => {
					event.preventDefault();
					send(draft);
				}}
			>
				<Group gap="xs" align="flex-end" wrap="nowrap">
					<Textarea
						flex={1}
						autosize
						minRows={1}
						maxRows={5}
						maxLength={1_000}
						aria-label={m.agent_placeholder()}
						placeholder={m.agent_placeholder()}
						value={draft}
						disabled={disabled}
						onChange={(event) => setDraft(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								send(draft);
							}
						}}
					/>
					{busy ? (
						<Tooltip label={m.agent_stop()}>
							<ActionIcon
								size="lg"
								variant="default"
								aria-label={m.agent_stop()}
								onClick={() => void agent.cancel()}
							>
								<StopCircle size={18} />
							</ActionIcon>
						</Tooltip>
					) : (
						<Tooltip label={m.agent_send()}>
							<ActionIcon
								size="lg"
								type="submit"
								aria-label={m.agent_send()}
								disabled={disabled || !draft.trim()}
							>
								<PaperPlaneRight size={18} />
							</ActionIcon>
						</Tooltip>
					)}
				</Group>
			</form>

			<Group justify="space-between" gap="xs">
				<Text size="xs" c="dimmed">
					{m.agent_disclaimer()}
				</Text>
				{agent.messages.length > 0 && (
					<Box>
						<Button
							variant="subtle"
							size="compact-xs"
							leftSection={<ArrowClockwise size={12} />}
							disabled={busy}
							onClick={() => void agent.newSession()}
						>
							{m.agent_new()}
						</Button>
					</Box>
				)}
			</Group>
		</Stack>
	);
}
