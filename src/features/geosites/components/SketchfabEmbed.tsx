type Props = { uid: string; title: string };

/**
 * Sketchfab's own viewer, for models we may show but not redistribute.
 * `dnt=1` asks Sketchfab not to track viewers.
 */
export function SketchfabEmbed({ uid, title }: Props) {
	const params = new URLSearchParams({
		autostart: "1",
		ui_theme: "dark",
		ui_infos: "0",
		ui_watermark_link: "0",
		dnt: "1",
	});
	return (
		<iframe
			title={title}
			src={`https://sketchfab.com/models/${uid}/embed?${params}`}
			allow="autoplay; fullscreen; xr-spatial-tracking"
			allowFullScreen
			style={{ width: "100%", height: "100%", border: 0 }}
		/>
	);
}
