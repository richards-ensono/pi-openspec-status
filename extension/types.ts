/**
 * Type definitions for the OpenSpec Status extension.
 */

export interface TaskCounts {
	total: number;
	complete: number;
}

export interface ArtifactMap {
	[k: string]: "pending" | "done";
}

export interface OpenSpecState {
	/** Active changes found under openspec/changes/ (excluding archive/) */
	changes: Array<{
		name: string;
		schema: string;
		artifacts: ArtifactMap;
		tasks: TaskCounts;
		/** Number of files in the specs/ directory (0 if absent or empty). */
		specCount: number;
	}>;
}

/** Names of file-based artifacts we scan for under a change directory. */
export const ARTIFACT_NAMES = ["proposal", "design", "tasks"] as const;

/** Identifier used for TUI widget and status. */
export const WIDGET_ID = "openspec-status";

/** Debounce interval for state refresh (ms). */
export const DEBOUNCE_MS = 500;
