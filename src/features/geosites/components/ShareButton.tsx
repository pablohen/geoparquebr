import { Button, type ButtonProps, CopyButton } from "@mantine/core";
import { Check, LinkSimple, ShareNetwork } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type Props = {
	url: string;
	title: string;
	text?: string;
} & Pick<ButtonProps, "size" | "variant">;

/**
 * Native share sheet where the browser has one (phones), otherwise copies
 * the link. Feature-detected after mount, so SSR always renders "copy".
 */
export function ShareButton({
	url,
	title,
	text,
	size = "xs",
	variant = "default",
}: Props) {
	const [canShare, setCanShare] = useState(false);
	useEffect(() => {
		setCanShare(typeof navigator.share === "function");
	}, []);

	if (canShare)
		return (
			<Button
				size={size}
				variant={variant}
				leftSection={<ShareNetwork size={14} />}
				onClick={() =>
					// Dismissing the share sheet rejects; that's not an error.
					navigator.share({ url, title, text }).catch(() => {})
				}
			>
				Compartilhar
			</Button>
		);

	return (
		<CopyButton value={url} timeout={2000}>
			{({ copied, copy }) => (
				<Button
					size={size}
					variant={variant}
					color={copied ? "teal" : undefined}
					leftSection={copied ? <Check size={14} /> : <LinkSimple size={14} />}
					onClick={copy}
				>
					{copied ? "Link copiado" : "Copiar link"}
				</Button>
			)}
		</CopyButton>
	);
}
