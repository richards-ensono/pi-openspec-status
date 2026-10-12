import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import type { ChangeDetail, ChangeSummary } from "../extension/types.ts";

export async function createProject(t: TestContext): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "openspec-test-"));
	t.after(() => rm(root, { recursive: true, force: true }));
	await mkdir(join(root, "openspec", "changes"), { recursive: true });
	return root;
}

export function summary(name = "fix-issue-42", completedTasks = 1): ChangeSummary {
	return { name, completedTasks, totalTasks: 2, lastModified: "2026-01-01", status: "in-progress" };
}

export function detail(name = "fix-issue-42"): ChangeDetail {
	return { changeName: name, schemaName: "spec-driven", isComplete: false, applyRequires: ["tasks"], artifacts: [{ id: "tasks", status: "done" }] };
}
