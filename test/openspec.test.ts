import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	checkCliAvailable, fetchActiveChanges, fetchChangeDetails, fetchTaskGroups,
	getChangeListFingerprint, getChangeStatus, getOpenSpecDir, listChanges,
	resetOpenSpecDir, resolveOpenSpecDir,
} from "../extension/openspec.ts";
import { createProject, detail, summary } from "./fixtures.ts";

const result = (data: unknown) => ({ code: 0, stdout: JSON.stringify(data), stderr: "" });

test("resolution uses normalized session cwd and caches/reset lookups per project", async (t) => {
	const a = await createProject(t);
	const b = await createProject(t);
	const child = join(a, "nested");
	await mkdir(child);
	let gitCalls = 0;
	const pi = { exec: async (command: string, args: string[], options: { cwd: string }) => {
		assert.equal(command, "git");
		assert.deepEqual(args, ["rev-parse", "--show-toplevel"]);
		assert.equal(options.cwd, child);
		gitCalls++;
		return { code: 0, stdout: `${a}\n` };
	} } as never;
	resetOpenSpecDir();
	assert.equal(await resolveOpenSpecDir(pi, b), b);
	assert.equal(await getOpenSpecDir(pi, join(child, ".")), a);
	assert.equal(await getOpenSpecDir(pi, child + "/"), a);
	assert.equal(gitCalls, 1);
	assert.equal(await getOpenSpecDir(pi, b), b);
	resetOpenSpecDir(child + "/");
	assert.equal(await getOpenSpecDir(pi, child), a);
	assert.equal(gitCalls, 2);
});

test("non-project directories return no changes without invoking OpenSpec", async (t) => {
	const root = await createProject(t);
	await rm(join(root, "openspec"), { recursive: true });
	const calls: string[] = [];
	const pi = { exec: async (command: string) => { calls.push(command); return { code: 1, stdout: "" }; } } as never;
	assert.deepEqual(await listChanges(pi, root), { changes: [], error: null });
	assert.deepEqual(await fetchTaskGroups(pi, "fix-issue-42", root), []);
	assert.deepEqual(calls, ["git"]);
});

test("malformed lists are rejected before status or task access", async (t) => {
	const root = await createProject(t);
	for (const payload of [null, [], { changes: {} }, { changes: [summary(), summary("../outside")] }, { changes: [{ ...summary(), totalTasks: -1 }] }]) {
		const calls: string[][] = [];
		const pi = { exec: async (_command: string, args: string[]) => { calls.push(args); return result(payload); } } as never;
		const fetched = await fetchActiveChanges(pi, { cwd: root });
		assert.equal(fetched.error, "OpenSpec returned invalid change data");
		assert.deepEqual(fetched.changes, []);
		assert.equal(fetched.details.size, 0);
		assert.equal(fetched.taskGroups.size, 0);
		assert.deepEqual(calls, [["list", "--json"]]);
	}
});

test("status validation and errors never reflect untrusted diagnostic text", async (t) => {
	const root = await createProject(t);
	for (const payload of [{ ...detail(), artifacts: "invalid" }, detail("different-name"), { ...detail(), schemaName: "bad\nlabel" }]) {
		const pi = { exec: async () => result(payload) } as never;
		assert.deepEqual(await getChangeStatus(pi, "fix-issue-42", root), { detail: null, error: "OpenSpec returned invalid status data" });
	}
	for (const response of [
		{ code: 1, stdout: "synthetic-private-diagnostic\n", stderr: "\x1b[2Junsafe" },
		{ code: 0, stdout: "not-json", stderr: "" },
	]) {
		const pi = { exec: async () => response } as never;
		const fetched = await listChanges(pi, root);
		assert.ok(fetched.error);
		assert.equal(fetched.error.includes("synthetic-private-diagnostic"), false);
		assert.equal(/[\n\x1b]/.test(fetched.error), false);
	}
	const pi = { exec: async () => { throw new Error("synthetic-private-diagnostic"); } } as never;
	assert.deepEqual(await checkCliAvailable(pi, root), { available: false, reason: "OpenSpec CLI could not be executed" });
});

test("detail requests run concurrently and preserve input order", async (t) => {
	const root = await createProject(t);
	let release!: () => void;
	const gate = new Promise<void>((resolve) => { release = resolve; });
	let active = 0;
	let maximum = 0;
	const pi = { exec: async (_command: string, args: string[], options: { cwd: string }) => {
		assert.equal(options.cwd, root);
		active++;
		maximum = Math.max(maximum, active);
		if (active === 2) release();
		await gate;
		active--;
		return result(detail(args[3]));
	} } as never;
	const fetched = await fetchChangeDetails(pi, [summary("first"), summary("second")], { cwd: root });
	assert.equal(maximum, 2);
	assert.equal(fetched.error, null);
	assert.deepEqual([...fetched.details.keys()], ["first", "second"]);
	assert.equal(fetched.taskGroups.size, 0);
});

test("detail failure discards partial snapshots and direct invalid summaries launch nothing", async (t) => {
	const root = await createProject(t);
	let calls = 0;
	const pi = { exec: async (_command: string, args: string[]) => {
		calls++;
		return result(args[3] === "first" ? detail("first") : { ...detail("second"), artifacts: "invalid" });
	} } as never;
	const fetched = await fetchChangeDetails(pi, [summary("first"), summary("second")], { cwd: root, includeTaskGroups: true });
	assert.equal(fetched.error, "OpenSpec returned invalid status data");
	assert.equal(fetched.details.size, 0);
	assert.equal(fetched.taskGroups.size, 0);
	assert.equal(calls, 2);
	await fetchChangeDetails(pi, [summary("../escape")], { cwd: root });
	assert.equal(calls, 2);
});

test("active-change fetching includes task groups by default and can omit them", async (t) => {
	const root = await createProject(t);
	const change = join(root, "openspec", "changes", "fix-issue-42");
	await mkdir(change);
	await writeFile(join(change, "tasks.md"), "## Build\n- [x] done\n- [ ] pending\n");
	const pi = { exec: async (_command: string, args: string[]) => result(args[0] === "list" ? { changes: [summary()] } : detail()) } as never;
	const withTasks = await fetchActiveChanges(pi, { cwd: root });
	assert.equal(withTasks.taskGroups.get("fix-issue-42")?.[0]?.total, 2);
	const withoutTasks = await fetchActiveChanges(pi, { cwd: root, includeTaskGroups: false });
	assert.equal(withoutTasks.taskGroups.size, 0);
	assert.deepEqual(withTasks.changes, withoutTasks.changes);
});

test("task containment rejects a symlinked changes root and prefix-sharing sibling", async (t) => {
	const root = await createProject(t);
	const outside = join(root, "openspec", "changes-evil");
	await mkdir(join(outside, "fix-issue-42"), { recursive: true });
	await writeFile(join(outside, "fix-issue-42", "tasks.md"), "## Outside\n- [ ] synthetic\n");
	const changesRoot = join(root, "openspec", "changes");
	await symlink(join(outside, "fix-issue-42"), join(changesRoot, "linked-change"));
	const pi = { exec: async () => { throw new Error("Unexpected subprocess"); } } as never;
	assert.deepEqual(await fetchTaskGroups(pi, "linked-change", root), []);
	await rm(changesRoot, { recursive: true });
	await symlink(outside, changesRoot);
	assert.deepEqual(await fetchTaskGroups(pi, "fix-issue-42", root), []);
});

test("fingerprints ignore list order but include all summary fields", () => {
	const first = summary("first");
	const second = summary("second");
	assert.equal(getChangeListFingerprint([first, second]), getChangeListFingerprint([second, first]));
	for (const changed of [{ ...first, lastModified: "later" }, { ...first, status: "complete" }, { ...first, totalTasks: 3 }, { ...first, completedTasks: 2 }]) {
		assert.notEqual(getChangeListFingerprint([first]), getChangeListFingerprint([changed]));
	}
});
