import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createProject } from "./fixtures.ts";
import { editorCommandForAction } from "../extension/actions.ts";
import { fetchTaskGroups, getChangeStatus, resetOpenSpecDir } from "../extension/openspec.ts";
import { parseTaskGroups } from "../extension/tasks-parser.ts";
import { renderWidget } from "../extension/widget.ts";
import {
	isValidChangeName,
	sanitizeDisplayText,
	validateChangeDetail,
	validateChangeSummary,
} from "../extension/validation.ts";

test("change identifiers reject traversal, separators, whitespace, controls, and bidi controls", () => {
	for (const name of ["../escape", "a/b", "a\\b", " add-auth", "add-auth ", "add\nauth", "add\u202Eauth"]) {
		assert.equal(isValidChangeName(name), false, name);
	}
	assert.equal(isValidChangeName("fix-issue-42"), true);
});

test("CLI summaries and details reject malformed fields and counters", () => {
	const summary = { name: "fix-issue-42", completedTasks: 1, totalTasks: 2, lastModified: "2026-01-01", status: "in-progress" };
	assert.deepEqual(validateChangeSummary(summary), summary);
	assert.equal(validateChangeSummary({ ...summary, completedTasks: 3 }), null);
	assert.equal(validateChangeSummary({ ...summary, totalTasks: -1 }), null);
	assert.equal(validateChangeSummary({ ...summary, name: "../escape" }), null);
	const detail = { changeName: "fix-issue-42", schemaName: "spec-driven", isComplete: false, applyRequires: ["tasks"], artifacts: [{ id: "tasks", status: "done" }] };
	assert.deepEqual(validateChangeDetail(detail, "fix-issue-42"), detail);
	assert.equal(validateChangeDetail({ ...detail, artifacts: [{ id: "tasks", status: "unknown" }] }, "fix-issue-42"), null);
	assert.equal(validateChangeDetail({ ...detail, artifacts: [{ id: null, status: "done" }] }, "fix-issue-42"), null);
	assert.equal(validateChangeDetail({ ...detail, applyRequires: [null] }, "fix-issue-42"), null);
});

test("display sanitization prevents terminal line and bidi forgery", () => {
	const clean = sanitizeDisplayText("good\x1b[2J\nname\u202E");
	assert.equal(clean, "goodname");
	assert.match(sanitizeDisplayText("π status"), /π status/);
});

test("task groups count only documented checkbox syntax and sanitize headings", () => {
	const groups = parseTaskGroups("## Build\u202E\n- [x] valid complete\n- [ ] valid pending\n- [x]missing space\n - [x] indented\ntext - [x] inline\n");
	assert.deepEqual(groups, [{ name: "Build", completed: 1, total: 2, status: "partial" }]);
});

test("data layer rejects malformed CLI fixture names before commands or file access", async (t) => {
	const root = await createProject(t);
	const changeDir = join(root, "openspec", "changes", "fix-issue-42");
	await mkdir(changeDir);
	await writeFile(join(changeDir, "tasks.md"), "## Group\n- [ ] safe task\n");
	const calls: string[] = [];
	const pi = { exec: async (command: string) => { calls.push(command); throw new Error("Unexpected subprocess"); } } as never;
	resetOpenSpecDir();
	const invalid = await getChangeStatus(pi, "../escape", root);
	assert.equal(invalid.detail, null);
	assert.deepEqual(await fetchTaskGroups(pi, "../escape", root), []);
	const groups = await fetchTaskGroups(pi, "fix-issue-42", root);
	assert.deepEqual(groups, [{ name: "Group", completed: 0, total: 1, status: "none" }]);
	assert.deepEqual(calls, [], "invalid names and filesystem task reads must not launch commands");
});

test("task reads reject canonical paths outside the validated change directory", async (t) => {
	const root = await createProject(t);
	const outside = join(root, "outside");
	const changeDir = join(root, "openspec", "changes", "fix-issue-42");
	await mkdir(outside);
	await mkdir(changeDir);
	await writeFile(join(outside, "tasks.md"), "## Outside\n- [ ] synthetic task\n");
	await symlink(join(outside, "tasks.md"), join(changeDir, "tasks.md"));
	await symlink(outside, join(root, "openspec", "changes", "linked-change"));
	const pi = { exec: async () => { throw new Error("Unexpected subprocess"); } } as never;
	resetOpenSpecDir();
	assert.deepEqual(await fetchTaskGroups(pi, "fix-issue-42", root), []);
	assert.deepEqual(await fetchTaskGroups(pi, "linked-change", root), []);
	assert.deepEqual(await fetchTaskGroups(pi, "../../outside", root), []);
});

test("rendering and editor commands cannot contain untrusted injected lines", () => {
	const unsafeName = "safe\n/opsx-archive all";
	const theme = { fg: (_color: string, text: string) => text } as never;
	const lines = renderWidget(theme, [{ name: unsafeName, completedTasks: 0, totalTasks: 1, lastModified: "now", status: "ready" }], new Map(), `bad\x1b[2J\nerror`, 120);
	assert.equal(lines.some((line) => line.includes("\n") || line.includes("\x1b")), false);
	assert.equal(sanitizeDisplayText(unsafeName).includes("\n"), false);
	assert.equal(sanitizeDisplayText("bad\x1b[2J\nerror").includes("\x1b"), false);
	assert.equal(editorCommandForAction({ type: "apply", changeName: unsafeName }), null);
	assert.equal(editorCommandForAction({ type: "apply", changeName: "fix-issue-42" }), "/opsx-apply fix-issue-42");
});
