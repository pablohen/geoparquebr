/** Server-only store of what each GEOSSIT sync changed (`geosite_changes`). */
import { type Collection, ObjectId } from "mongodb";
import { getDb } from "~/lib/db.server";
import { hasChanges } from "./changes";
import type { ChangeRun, SyncChanges } from "./schemas";

/** About a year of weekly syncs. */
const KEEP_RUNS = 52;

type ChangeRunDoc = SyncChanges & { _id: ObjectId; at: Date };

export async function changesCollection(): Promise<Collection<ChangeRunDoc>> {
	return (await getDb()).collection<ChangeRunDoc>("geosite_changes");
}

/** Stores one sync's changes (none: nothing stored) and keeps the latest runs. */
export async function recordChanges(
	changes: SyncChanges,
	at = new Date(),
): Promise<boolean> {
	if (!hasChanges(changes)) return false;
	const col = await changesCollection();
	await col.createIndex({ at: -1 }, { name: "at" });
	await col.insertOne({ _id: new ObjectId(), at, ...changes });
	const keep = await col
		.find({}, { projection: { _id: 1 }, sort: { at: -1 }, limit: KEEP_RUNS })
		.toArray();
	await col.deleteMany({ _id: { $nin: keep.map((d) => d._id) } });
	return true;
}

/** The latest runs, newest first. */
export async function listChanges(limit = 20): Promise<ChangeRun[]> {
	const docs = await (await changesCollection())
		.find({}, { sort: { at: -1 }, limit })
		.toArray();
	return docs.map(({ _id, at, ...rest }) => ({
		...rest,
		id: _id.toHexString(),
		at: at.toISOString(),
	}));
}
