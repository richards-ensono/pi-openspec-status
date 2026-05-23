/**
 * File I/O utilities for scanning OpenSpec change directories.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { TaskCounts } from "./types.js";
import { ARTIFACT_NAMES } from "./types.js";

/** Async file-existence check via stat. */
export async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

/** Parse - [x] / - [X] / - [ ] checkbox lines from a tasks.md file. */
export function countTasks(content: string): TaskCounts {
	let total = 0;
	let complete = 0;
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (/^-\s*\[x\]/i.test(trimmed)) {
			total++;
			complete++;
		} else if (trimmed.startsWith("- [ ]")) {
			total++;
		}
	}
	return { total, complete };
}

/**
 * Read the schema field from a .openspec.yaml file.
 * Handles bare, single-quoted, and double-quoted values.
 */
export function parseSchema(yaml: string): string {
	const match = yaml.match(/^\s*schema:\s*(?:'([^']+)'|"([^"]+)"|([^\s#]+))/m);
	if (match) {
		return (match[1] ?? match[2] ?? match[3]).trim();
	}
	return "spec-driven";
}

/** Scan a single change directory and build its status snapshot. */
export async function scanChangeDir(
	changesDir: string,
	name: string,
): Promise<OpenSpecChange> {
	const dir = join(changesDir, name);

	// Schema
	let schema = "spec-driven";
	try {
		const yaml = await readFile(join(dir, ".openspec.yaml"), "utf-8");
		schema = parseSchema(yaml);
	} catch {
		/* no .openspec.yaml — assume default */
	}

	// Artifact status (async file checks)
	const artifacts: Record<string, "pending" | "done"> = {};
	for (const artifact of ARTIFACT_NAMES) {
		artifacts[artifact] = (await fileExists(join(dir, `${artifact}.md`)))
			? "done"
			: "pending";
	}

	// specs/ directory — count files
	let specCount = 0;
	try {
		const specs = await readdir(join(dir, "specs"));
		specCount = specs.length;
	} catch {
		/* no specs dir */
	}
	artifacts.specs = specCount > 0 ? "done" : "pending";

	// Tasks
	let tasks: TaskCounts = { total: 0, complete: 0 };
	try {
		const content = await readFile(join(dir, "tasks.md"), "utf-8");
		tasks = countTasks(content);
	} catch {
		/* no tasks file yet */
	}

	return { name, schema, artifacts, tasks, specCount };
}

// Internal type used within this module — mirrors the change shape in OpenSpecState.
interface OpenSpecChange {
	name: string;
	schema: string;
	artifacts: Record<string, "pending" | "done">;
	tasks: TaskCounts;
	specCount: number;
}
