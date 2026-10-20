/**
 * Shrinks photogrammetry scans (often millions of triangles, 8K textures) into
 * something a browser can open: simplify → WebP textures → meshopt compression.
 * three.js/drei decode meshopt natively (no CDN decoder needed, unlike Draco).
 */
import { type Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
	dedup,
	meshopt,
	prune,
	simplify,
	textureCompress,
	weld,
} from "@gltf-transform/functions";
import {
	MeshoptDecoder,
	MeshoptEncoder,
	MeshoptSimplifier,
} from "meshoptimizer";
import sharp from "sharp";

export type OptimizeOptions = {
	maxTriangles?: number;
	textureSize?: number;
};

export function countTriangles(doc: Document): number {
	let total = 0;
	for (const mesh of doc.getRoot().listMeshes())
		for (const prim of mesh.listPrimitives()) {
			const count =
				prim.getIndices()?.getCount() ??
				prim.getAttribute("POSITION")?.getCount() ??
				0;
			total += Math.floor(count / 3);
		}
	return total;
}

export async function optimizeGlb(
	input: Uint8Array,
	{ maxTriangles = 300_000, textureSize = 2048 }: OptimizeOptions = {},
) {
	await Promise.all([
		MeshoptDecoder.ready,
		MeshoptEncoder.ready,
		MeshoptSimplifier.ready,
	]);
	const io = new NodeIO()
		.registerExtensions(ALL_EXTENSIONS)
		.registerDependencies({
			"meshopt.decoder": MeshoptDecoder,
			"meshopt.encoder": MeshoptEncoder,
		});

	const doc = await io.readBinary(input);
	const before = countTriangles(doc);
	const ratio = Math.min(1, maxTriangles / Math.max(before, 1));

	await doc.transform(
		dedup(),
		weld(),
		...(ratio < 1
			? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 })]
			: []),
		prune(),
		textureCompress({
			encoder: sharp,
			targetFormat: "webp",
			resize: [textureSize, textureSize],
		}),
		meshopt({ encoder: MeshoptEncoder, level: "medium" }),
	);

	return {
		glb: await io.writeBinary(doc),
		trianglesBefore: before,
		trianglesAfter: countTriangles(doc),
	};
}
