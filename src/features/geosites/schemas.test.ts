import { describe, expect, it } from "vitest";
import {
	BBoxSchema,
	DEFAULT_BBOX,
	ExplorerSearchSchema,
	GeositeInputSchema,
	Model3DSchema,
} from "./schemas";

describe("ExplorerSearchSchema", () => {
	it("defaults to the Araripe viewport", () => {
		expect(ExplorerSearchSchema.parse({})).toEqual({ bbox: DEFAULT_BBOX });
	});

	it("keeps valid params", () => {
		const search = {
			bbox: [-41, -8, -38, -6],
			cat: ["paleontological", "speleological"],
			rel: "international",
			gp: "araripe",
			site: "pedra-cariri",
			tab: "fossils",
			model: 1,
			geo: true,
		};
		expect(ExplorerSearchSchema.parse(search)).toEqual(search);
	});

	it("falls back field by field instead of rejecting a bad link", () => {
		const parsed = ExplorerSearchSchema.parse({
			bbox: [-38, -8, -41, -6], // west > east
			cat: ["volcanoes"],
			rel: "planetary",
			gp: "atlantis",
			site: "Not A Slug",
			tab: "photos",
			model: -1,
		});
		expect(parsed).toEqual({ bbox: DEFAULT_BBOX });
	});

	it("only accepts `geo: true` for the geology layer", () => {
		expect(ExplorerSearchSchema.parse({ geo: true }).geo).toBe(true);
		expect(ExplorerSearchSchema.parse({ geo: false }).geo).toBeUndefined();
		expect(ExplorerSearchSchema.parse({ geo: "yes" }).geo).toBeUndefined();
	});

	it("only accepts `terrain: true` for 3D terrain", () => {
		expect(ExplorerSearchSchema.parse({ terrain: true }).terrain).toBe(true);
		expect(ExplorerSearchSchema.parse({ terrain: 1 }).terrain).toBeUndefined();
		expect(ExplorerSearchSchema.parse({}).terrain).toBeUndefined();
	});

	it("coerces a numeric model index from the query string", () => {
		expect(ExplorerSearchSchema.parse({ model: "2" }).model).toBe(2);
	});
});

describe("BBoxSchema", () => {
	it("rejects out-of-range coordinates", () => {
		expect(BBoxSchema.safeParse([-200, -8, -38, -6]).success).toBe(false);
		expect(BBoxSchema.safeParse([-41, -8, -38, 95]).success).toBe(false);
	});
});

describe("Model3DSchema", () => {
	const base = {
		kind: "fossil",
		title: "Peixe",
		provenance: "region",
		license: "CC-BY-4.0",
		attribution: "IGc-USP",
	};

	it("accepts self-hosted and HTTPS glTF URLs", () => {
		for (const url of ["/models/abc.glb", "https://cdn.example.org/a.glb"])
			expect(
				Model3DSchema.safeParse({
					...base,
					provider: "gltf",
					format: "glb",
					url,
				}).success,
			).toBe(true);
	});

	it("rejects plain HTTP and arbitrary paths", () => {
		for (const url of [
			"http://cdn.example.org/a.glb",
			"/etc/passwd",
			"/models/../x.glb",
		])
			expect(
				Model3DSchema.safeParse({
					...base,
					provider: "gltf",
					format: "glb",
					url,
				}).success,
			).toBe(false);
	});

	it("requires a 32-hex uid for Sketchfab embeds", () => {
		expect(
			Model3DSchema.safeParse({ ...base, provider: "sketchfab", uid: "abc" })
				.success,
		).toBe(false);
		expect(
			Model3DSchema.safeParse({
				...base,
				provider: "sketchfab",
				uid: "d8f10872f8f54154892076ec241e71f0",
			}).success,
		).toBe(true);
	});
});

describe("GeositeInputSchema", () => {
	it("applies defaults and upper-cases the state", () => {
		const parsed = GeositeInputSchema.parse({
			slug: "pedra-cariri",
			name: "Pedra Cariri",
			summary: "",
			municipality: "Nova Olinda",
			state: "ce",
			categories: [],
			relevance: "international",
			location: { type: "Point", coordinates: [-39.695, -7.122] },
		});
		expect(parsed).toMatchObject({
			state: "CE",
			models: [],
			locationIsSensitive: false,
		});
	});

	it("rejects coordinates in [lat, lng] order when out of range", () => {
		expect(
			GeositeInputSchema.shape.location.safeParse({
				type: "Point",
				coordinates: [-7.122, -139.695],
			}).success,
		).toBe(false);
	});
});
