/** Data layer for OpenSpec CLI interaction. All CLI data is validated here. */

import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { ChangeSummary, ChangeDetail, TaskGroup } from "./types.ts";
import { parseTaskGroups } from "./tasks-parser.ts";
import { execOpenSpec } from "./cli.ts";
import {
	isValidChangeName,
	safeError,
	validateChangeDetail,
	validateChangeSummary,
} from "./validation.ts";

export interface CliCheckResult {
	available: boolean;
	reason?: string;
}

// Scope lookups to normalized session cwd, not the hosting process's project.
const _openSpecDirs = new Map<string, Promise<string | null>>();

async function hasOpenSpecChanges(root: string): Promise<boolean> {
	try {
		return (await stat(join(root, "openspec", "changes"))).isDirectory();
	} catch {
		return false;
	}
}

/** Resolve the session project root containing openspec/changes, with git fallback. */
export async function resolveOpenSpecDir(pi: ExtensionAPI, cwd = process.cwd()): Promise<string | null> {
	cwd = resolve(cwd);
	if (await hasOpenSpecChanges(cwd)) return cwd;
	try {
		const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { timeout: 5000, cwd });
		const root = result.code === 0 ? result.stdout?.trim() : undefined;
		if (root && isAbsolute(root) && await hasOpenSpecChanges(root)) return resolve(root);
	} catch { /* no OpenSpec root */ }
	return null;
}

export async function getOpenSpecDir(pi: ExtensionAPI, cwd = process.cwd()): Promise<string | null> {
	const key = resolve(cwd);
	let lookup = _openSpecDirs.get(key);
	if (!lookup) {
		lookup = resolveOpenSpecDir(pi, key);
		_openSpecDirs.set(key, lookup);
	}
	return lookup;
}

/** Reset one session cwd's lookup, or all lookups for existing callers. */
export function resetOpenSpecDir(cwd?: string): void {
	if (cwd === undefined) _openSpecDirs.clear();
	else _openSpecDirs.delete(resolve(cwd));
}

export async function checkCliAvailable(pi: ExtensionAPI, cwd = process.cwd()): Promise<CliCheckResult> {
	try {
		const result = await execOpenSpec(pi, ["--version"], { timeout: 5000, cwd });
		return result.code === 0
			? { available: true }
			: { available: false, reason: "OpenSpec CLI returned a non-zero exit code" };
	} catch {
		return { available: false, reason: "OpenSpec CLI could not be executed" };
	}
}

async function execOpenSpecJson(
	pi: ExtensionAPI,
	args: string[],
	errorLabel: string,
	cwd: string,
): Promise<{ data: unknown | null; error: string | null }> {
	try {
		const result = await execOpenSpec(pi, args, { timeout: 10000, cwd });
		if (result.code !== 0) return { data: null, error: `${errorLabel}: command failed` };
		try {
			return { data: JSON.parse(result.stdout?.trim() || ""), error: null };
		} catch {
			return { data: null, error: `${errorLabel}: invalid JSON response` };
		}
	} catch {
		return { data: null, error: `${errorLabel}: command failed` };
	}
}

/** Fetch active changes; malformed payloads are rejected wholesale. */
export async function listChanges(pi: ExtensionAPI, cwd = process.cwd()): Promise<{ changes: ChangeSummary[]; error: string | null }> {
	const dir = await getOpenSpecDir(pi, cwd);
	if (!dir) return { changes: [], error: null };
	const result = await execOpenSpecJson(pi, ["list", "--json"], "OpenSpec list", dir);
	if (result.error) return { changes: [], error: safeError(result.error) };
	if (!result.data || typeof result.data !== "object" || !Array.isArray((result.data as { changes?: unknown }).changes)) {
		return { changes: [], error: "OpenSpec returned invalid change data" };
	}
	const changes = (result.data as { changes: unknown[] }).changes.map(validateChangeSummary);
	if (changes.some((change) => change === null)) {
		return { changes: [], error: "OpenSpec returned invalid change data" };
	}
	return { changes: changes as ChangeSummary[], error: null };
}

/** Invalid identifiers never reach the CLI, even for direct API callers. */
export async function getChangeStatus(
	pi: ExtensionAPI,
	name: string,
	cwd = process.cwd(),
): Promise<{ detail: ChangeDetail | null; error: string | null }> {
	if (!isValidChangeName(name)) return { detail: null, error: "OpenSpec returned an invalid change name" };
	const dir = await getOpenSpecDir(pi, cwd);
	const result = await execOpenSpecJson(pi, ["status", "--json", "--change", name], "OpenSpec status", dir ?? cwd);
	if (result.error) return { detail: null, error: safeError(result.error) };
	const detail = validateChangeDetail(result.data, name);
	return detail
		? { detail, error: null }
		: { detail: null, error: "OpenSpec returned invalid status data" };
}

/** Read tasks only beneath the canonical project changes root, never a CLI path. */
export async function fetchTaskGroups(pi: ExtensionAPI, changeName: string, cwd = process.cwd()): Promise<TaskGroup[]> {
	if (!isValidChangeName(changeName)) return [];
	try {
		const dir = await getOpenSpecDir(pi, cwd);
		if (!dir) return [];
		const root = await realpath(dir);
		const changesRoot = join(root, "openspec", "changes");
		const changeDir = await realpath(join(changesRoot, changeName));
		const withinChanges = relative(changesRoot, changeDir);
		if (!withinChanges || isAbsolute(withinChanges) || withinChanges === ".." || withinChanges.startsWith(`..${sep}`)) return [];
		const tasksFile = await realpath(join(changeDir, "tasks.md"));
		if (tasksFile !== join(changeDir, "tasks.md")) return [];
		const content = await readFile(tasksFile, "utf8");
		return content.trim() ? parseTaskGroups(content) : [];
	} catch {
		return [];
	}
}

/** Stable fingerprint of already validated list data, independent of CLI order. */
export function getChangeListFingerprint(changes: ChangeSummary[]): string {
	const entries = changes.map((change) => ({
		name: change.name,
		lastModified: change.lastModified,
		completedTasks: change.completedTasks,
		totalTasks: change.totalTasks,
		status: change.status,
	})).sort((a, b) => {
		if (a.name < b.name) return -1;
		if (a.name > b.name) return 1;
		const aSerialized = JSON.stringify(a);
		const bSerialized = JSON.stringify(b);
		return aSerialized < bSerialized ? -1 : aSerialized > bSerialized ? 1 : 0;
	});
	return JSON.stringify(entries);
}

export interface FetchActiveChangesOptions {
	/** Pi session cwd; omitted only by legacy process-local callers. */
	cwd?: string;
	/** Background refreshes can skip task reads; the overlay requests them. */
	includeTaskGroups?: boolean;
}

export interface FetchChangeDetailsResult {
	details: Map<string, ChangeDetail>;
	taskGroups: Map<string, TaskGroup[]>;
	error: string | null;
}

/** Fetch statuses concurrently, but expose no partial state on invalid data/failure. */
export async function fetchChangeDetails(
	pi: ExtensionAPI,
	changes: ChangeSummary[],
	options: FetchActiveChangesOptions = {},
): Promise<FetchChangeDetailsResult> {
	const validated = changes.map(validateChangeSummary);
	if (validated.some((change) => change === null)) {
		return { details: new Map(), taskGroups: new Map(), error: "OpenSpec returned invalid change data" };
	}
	const results = await Promise.all((validated as ChangeSummary[]).map(async (change) => {
		const [{ detail, error }, groups] = await Promise.all([
			getChangeStatus(pi, change.name, options.cwd),
			options.includeTaskGroups === true ? fetchTaskGroups(pi, change.name, options.cwd) : Promise.resolve([] as TaskGroup[]),
		]);
		return { change, detail, error, groups };
	}));
	const failed = results.find(({ detail, error }) => error || !detail);
	if (failed) {
		return { details: new Map(), taskGroups: new Map(), error: failed.error ?? "OpenSpec returned invalid status data" };
	}
	const details = new Map<string, ChangeDetail>();
	const taskGroups = new Map<string, TaskGroup[]>();
	for (const { change, detail, groups } of results) {
		details.set(change.name, detail!);
		if (options.includeTaskGroups === true) taskGroups.set(change.name, groups);
	}
	return { details, taskGroups, error: null };
}

/** Fetch active changes with validated details/tasks; preserve the legacy defaults. */
export async function fetchActiveChanges(pi: ExtensionAPI, options: FetchActiveChangesOptions = {}): Promise<{
	changes: ChangeSummary[];
	details: Map<string, ChangeDetail>;
	taskGroups: Map<string, TaskGroup[]>;
	error: string | null;
}> {
	const { changes, error: listError } = await listChanges(pi, options.cwd);
	if (listError) return { changes: [], details: new Map(), taskGroups: new Map(), error: listError };
	const result = await fetchChangeDetails(pi, changes, { ...options, includeTaskGroups: options.includeTaskGroups ?? true });
	return { changes: result.error ? [] : changes, ...result };
}
