import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createProject } from "./fixtures.ts";

test("syntax validation checks later files in both test directories without executing them", async (t) => {
	const root = await createProject(t);
	// Match this repository's module context for Node's TypeScript syntax check.
	await writeFile(join(root, "package.json"), JSON.stringify({ type: "module" }));
	for (const directory of ["extension", "test", "tests", "scripts"]) await mkdir(join(root, directory));
	await writeFile(join(root, "extension", "first.ts"), 'throw new Error("must not execute");\n');
	await writeFile(join(root, "test", "valid.ts"), "const valid: number = 1;\n");
	const invalid = join(root, "tests", "later.ts");
	await writeFile(invalid, "const invalid = ;\n");
	const script = join(process.cwd(), "scripts", "check-syntax.mjs");
	const failed = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 5000 });
	assert.equal(failed.status, 1);
	assert.match(failed.stderr, /SyntaxError/);
	assert.match(failed.stderr, /later\.ts/);
	await writeFile(invalid, "const valid: string = 'fixed';\n");
	const passed = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 5000 });
	assert.equal(passed.status, 0, passed.stderr);
});
