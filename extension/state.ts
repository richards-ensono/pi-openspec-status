/**
 * State management for the OpenSpec Status extension.
 *
 * Maintains a cached snapshot of OpenSpec change directories and
 * provides a debounced refresh mechanism.
 */

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type { OpenSpecState } from "./types.js";
import { DEBOUNCE_MS } from "./types.js";
import { scanChangeDir } from "./fs-utils.js";

let state: OpenSpecState = { changes: [] };
let lastRefresh = 0;

/** Get the current (cached) state. */
export function getState(): OpenSpecState {
	return state;
}

/**
 * Refresh state by scanning openspec/changes/ under the given cwd.
 * Debounced: multiple rapid calls only trigger one scan.
 */
export async function refreshState(cwd: string): Promise<void> {
	const now = Date.now();
	if (now - lastRefresh < DEBOUNCE_MS) return;
	lastRefresh = now;

	try {
		const changesDir = join(cwd, "openspec", "changes");

		// Discover active change directories (skip archive/)
		let dirEntries: string[] = [];
		try {
			const entries = await readdir(changesDir, { withFileTypes: true });
			dirEntries = entries
				.filter((e) => e.isDirectory() && e.name !== "archive")
				.map((e) => e.name);
		} catch {
			// openspec/changes/ doesn't exist — no openspec project
			state = { changes: [] };
			return;
		}

		if (dirEntries.length === 0) {
			state = { changes: [] };
			return;
		}

		const changes = await Promise.all(
			dirEntries.map((name) => scanChangeDir(changesDir, name)),
		);

		state = { changes };
	} catch (err) {
		console.error("[openspec-status] refresh error:", err);
	}
}
