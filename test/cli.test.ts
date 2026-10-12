import assert from "node:assert/strict";
import test from "node:test";
import { createOpenSpecExecutor, crossSpawnExec } from "../extension/cli.ts";
import { createProject } from "./fixtures.ts";

const success = { code: 0, stdout: "ok", stderr: "", killed: false };
const failure = { code: 1, stdout: "", stderr: "failed", killed: false };

test("Windows launcher caches only a successful fallback and forwards options", async (t) => {
	const cwd = await createProject(t);
	const controller = new AbortController();
	const options = { cwd, timeout: 1234, signal: controller.signal };
	let directCalls = 0;
	let fallbackCalls = 0;
	const pi = { exec: async () => { directCalls++; return failure; } } as never;
	const executor = createOpenSpecExecutor(pi, "win32", async (command, args, receivedOptions) => {
		assert.equal(command, "openspec");
		assert.deepEqual(args, ["--version"]);
		assert.equal(receivedOptions, options);
		fallbackCalls++;
		return fallbackCalls === 1 ? failure : success;
	});
	assert.equal((await executor(["--version"], options)).code, 1);
	assert.equal((await executor(["--version"], options)).code, 0);
	assert.equal((await executor(["--version"], options)).code, 0);
	assert.equal(directCalls, 2);
	assert.equal(fallbackCalls, 3);
});

test("fallback handles Windows launcher exceptions but never reruns killed/aborted commands", async () => {
	let fallbacks = 0;
	const fallback = async () => { fallbacks++; return success; };
	const throwing = { exec: async () => { throw new Error("launcher unavailable"); } } as never;
	assert.deepEqual(await createOpenSpecExecutor(throwing, "win32", fallback)([]), success);
	await assert.rejects(createOpenSpecExecutor(throwing, "linux", fallback)([]), /launcher unavailable/);
	const killed = { exec: async () => ({ ...failure, killed: true }) } as never;
	assert.equal((await createOpenSpecExecutor(killed, "win32", fallback)([])).killed, true);
	const controller = new AbortController();
	controller.abort();
	await assert.rejects(createOpenSpecExecutor(throwing, "win32", fallback)([], { signal: controller.signal }));
	assert.equal(fallbacks, 1);
});

test("Unix failures and successful direct calls do not invoke fallback", async () => {
	const fallback = async () => { assert.fail("Unexpected fallback"); };
	const failed = { exec: async () => failure } as never;
	const passed = { exec: async () => success } as never;
	assert.deepEqual(await createOpenSpecExecutor(failed, "linux", fallback)([]), failure);
	assert.deepEqual(await createOpenSpecExecutor(passed, "win32", fallback)([]), success);
});

test("cross-spawn preserves cwd and keeps metacharacters as literal arguments", async (t) => {
	const cwd = await createProject(t);
	const literal = "literal;$(not-a-command)";
	const fetched = await crossSpawnExec(process.execPath, ["-e", "console.log(JSON.stringify([process.cwd(), process.argv[1]]))", literal], { cwd, timeout: 2000 });
	assert.equal(fetched.code, 0);
	assert.deepEqual(JSON.parse(fetched.stdout), [cwd, literal]);
});

test("cross-spawn reports exit codes, missing launchers, timeouts and cancellation", async () => {
	assert.equal((await crossSpawnExec(process.execPath, ["-e", "process.exit(7)"], { timeout: 2000 })).code, 7);
	assert.equal((await crossSpawnExec("openspec-nonexistent-review-fixture", [], { timeout: 2000 })).code, 1);
	const timed = await crossSpawnExec(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { timeout: 50 });
	assert.equal(timed.code, 1);
	assert.equal(timed.killed, true);
	assert.match(timed.stderr, /timed out/);
	const controller = new AbortController();
	const pending = crossSpawnExec(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { signal: controller.signal });
	controller.abort();
	const aborted = await pending;
	assert.equal(aborted.killed, true);
	assert.match(aborted.stderr, /aborted/);
	assert.equal((await crossSpawnExec(process.execPath, [], { signal: controller.signal })).killed, true);
});
