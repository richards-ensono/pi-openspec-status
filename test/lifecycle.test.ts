import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { setImmediate } from "node:timers/promises";
import { visibleWidth } from "@earendil-works/pi-tui";
import extension from "../extension/index.ts";
import { createProject, detail, summary } from "./fixtures.ts";
import type { ChangeSummary } from "../extension/types.ts";

type ExecResult = { code: number; stdout: string; stderr?: string };
type Context = {
	cwd: string;
	hasUI: boolean;
	isIdle: () => boolean;
	ui: { theme: { fg: (color: string, text: string) => string }; setWidget: (name: string, lines: string[]) => void };
};

async function drain(): Promise<void> {
	for (let i = 0; i < 10; i++) await setImmediate();
}

async function waitFor(condition: () => boolean): Promise<void> {
	for (let i = 0; i < 1000; i++) {
		if (condition()) { await drain(); return; }
		await setImmediate();
	}
	assert.fail("Async refresh did not reach the expected state");
}

async function harness(t: TestContext) {
	t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 0 });
	const cwd = await createProject(t);
	const calls: Array<{ args: string[]; cwd: string }> = [];
	const widgets: string[][] = [];
	const handlers = new Map<string, (event: Record<string, unknown>, ctx: Context) => Promise<void>>();
	const response: {
		changes: ChangeSummary[];
		listCode: number;
		statusPayload?: unknown;
		intercept?: (args: string[], cwd: string) => Promise<ExecResult | undefined>;
	} = { changes: [summary()], listCode: 0 };
	const pi = {
		on: (name: string, handler: (event: Record<string, unknown>, ctx: Context) => Promise<void>) => { handlers.set(name, handler); },
		registerShortcut: () => {},
		exec: async (_command: string, args: string[], options: { cwd: string }) => {
			calls.push({ args, cwd: options.cwd });
			const intercepted = await response.intercept?.(args, options.cwd);
			if (intercepted) return intercepted;
			if (args[0] === "--version") return { code: 0, stdout: "1.12.0", stderr: "" };
			if (args[0] === "list") return { code: response.listCode, stdout: JSON.stringify({ changes: response.changes }), stderr: "" };
			return { code: 0, stdout: JSON.stringify(response.statusPayload ?? detail(args[3])), stderr: "" };
		},
	};
	extension(pi as never);
	const ctx: Context = {
		cwd, hasUI: true, isIdle: () => true,
		ui: { theme: { fg: (_color, text) => text }, setWidget: (_name, lines) => { widgets.push(lines); } },
	};
	const emit = async (name: string, context = ctx, event: Record<string, unknown> = {}) => { await handlers.get(name)!(event, context); };
	const count = (command: string) => calls.filter(({ args }) => args[0] === command).length;
	const text = () => widgets.at(-1)?.join("\n") ?? "";
	t.after(() => emit("session_shutdown"));
	return { cwd, ctx, response, calls, widgets, emit, count, text };
}

test("snapshot caching skips details and fallback backs off with event reset", async (t) => {
	const h = await harness(t);
	await h.emit("session_start");
	await waitFor(() => h.text().includes("fix-issue-42"));
	assert.equal(h.count("status"), 1);
	assert.equal(h.calls.every(({ cwd }) => cwd === h.cwd), true);
	t.mock.timers.tick(30_000);
	await waitFor(() => h.count("list") === 2);
	assert.equal(h.count("status"), 1);
	t.mock.timers.tick(59_999);
	await drain();
	assert.equal(h.count("list"), 2);
	t.mock.timers.tick(1);
	await waitFor(() => h.count("list") === 3);
	t.mock.timers.tick(90_000);
	await waitFor(() => h.count("list") === 4);
	t.mock.timers.tick(120_000);
	await waitFor(() => h.count("list") === 5);
	t.mock.timers.tick(120_000);
	await waitFor(() => h.count("list") === 6);
	await h.emit("tool_result", h.ctx, { toolName: "powershell", input: { command: "openspec status" } });
	await h.emit("turn_end"); // Must not erase the relevant event's reset bit.
	t.mock.timers.tick(500);
	await waitFor(() => h.count("list") === 7);
	t.mock.timers.tick(30_000);
	await waitFor(() => h.count("list") === 8);
	assert.equal(h.count("status"), 1);
});

test("events during a fetch coalesce and fallback never overlaps active work", async (t) => {
	const h = await harness(t);
	await h.emit("session_start");
	await waitFor(() => h.text().includes("fix-issue-42"));
	let release!: (result: ExecResult) => void;
	const pending = new Promise<ExecResult>((resolve) => { release = resolve; });
	let blocked = false;
	h.response.intercept = async (args) => {
		if (args[0] === "list" && !blocked) { blocked = true; return pending; }
		return undefined;
	};
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => blocked);
	await h.emit("agent_end");
	t.mock.timers.tick(500);
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	t.mock.timers.tick(30_000);
	await drain();
	assert.equal(h.count("list"), 2);
	release({ code: 0, stdout: JSON.stringify({ changes: h.response.changes }) });
	await waitFor(() => h.count("list") === 3);
	assert.equal(h.count("status"), 1);
});

test("detail and list failures retain safe state; failed detail snapshots are retried", async (t) => {
	const h = await harness(t);
	await h.emit("session_start");
	await waitFor(() => h.text().includes("fix-issue-42"));
	h.response.changes = [summary("new-change")];
	h.response.statusPayload = { ...detail("new-change"), artifacts: "invalid" };
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => h.count("status") === 2);
	assert.match(h.text(), /fix-issue-42/);
	assert.match(h.text(), /invalid status data/);
	assert.equal(h.text().includes("new-change"), false);
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => h.count("status") === 3);
	h.response.statusPayload = undefined;
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => h.text().includes("new-change"));
	h.response.listCode = 1;
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => h.text().includes("command failed"));
	assert.match(h.text(), /new-change/);
	h.response.listCode = 0;
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => !h.text().includes("command failed"));
	assert.equal(h.count("status"), 4);
});

test("replacement sessions isolate cwd and ignore old async results", async (t) => {
	const h = await harness(t);
	const otherRoot = await createProject(t);
	let release!: (result: ExecResult) => void;
	const pending = new Promise<ExecResult>((resolve) => { release = resolve; });
	h.response.intercept = async (args, cwd) => args[0] === "list" && cwd === h.cwd ? pending : undefined;
	await h.emit("session_start");
	await waitFor(() => h.count("list") === 1);
	h.response.changes = [summary("new-session")];
	await h.emit("session_start", { ...h.ctx, cwd: otherRoot });
	await waitFor(() => h.text().includes("new-session"));
	const updates = h.widgets.length;
	release({ code: 0, stdout: JSON.stringify({ changes: [summary("old-session")] }) });
	await drain();
	assert.equal(h.widgets.length, updates);
	assert.equal(h.calls.some(({ args, cwd }) => args[0] === "status" && cwd === h.cwd), false);
	assert.equal(h.calls.some(({ args, cwd }) => args[0] === "status" && cwd === otherRoot), true);
});

test("headless session replacement and shutdown clear pending debounce/fallback work", async (t) => {
	const h = await harness(t);
	await h.emit("session_start");
	await waitFor(() => h.text().includes("fix-issue-42"));
	await h.emit("turn_end");
	await h.emit("session_start", { ...h.ctx, hasUI: false });
	const calls = h.calls.length;
	const updates = h.widgets.length;
	t.mock.timers.tick(200_000);
	await drain();
	assert.equal(h.calls.length, calls);
	assert.equal(h.widgets.length, updates);
	await h.emit("session_start");
	await waitFor(() => h.count("status") === 2);
	await h.emit("turn_end");
	await h.emit("session_shutdown");
	const afterShutdown = h.calls.length;
	t.mock.timers.tick(200_000);
	await drain();
	assert.equal(h.calls.length, afterShutdown);
});

test("fallback skips a busy agent without issuing CLI requests", async (t) => {
	const h = await harness(t);
	await h.emit("session_start");
	await waitFor(() => h.text().includes("fix-issue-42"));
	h.ctx.isIdle = () => false;
	t.mock.timers.tick(30_000);
	await drain();
	assert.equal(h.count("list"), 1);
	h.ctx.isIdle = () => true;
	t.mock.timers.tick(30_000);
	await waitFor(() => h.count("list") === 2);
});

test("hosted width accepts positive integers, falls back safely, and prefers terminal width", async (t) => {
	const previous = process.env.PI_OPENSPEC_STATUS_WIDTH;
	const columns = Object.getOwnPropertyDescriptor(process.stdout, "columns");
	t.after(() => {
		if (previous === undefined) delete process.env.PI_OPENSPEC_STATUS_WIDTH;
		else process.env.PI_OPENSPEC_STATUS_WIDTH = previous;
		if (columns) Object.defineProperty(process.stdout, "columns", columns);
		else Reflect.deleteProperty(process.stdout, "columns");
	});
	Object.defineProperty(process.stdout, "columns", { value: undefined, configurable: true });
	process.env.PI_OPENSPEC_STATUS_WIDTH = "38";
	const h = await harness(t);
	h.response.statusPayload = { ...detail(), schemaName: "s".repeat(160) };
	await h.emit("session_start");
	await waitFor(() => h.count("status") === 1);
	assert.equal(visibleWidth(h.widgets.at(-1)![0]!), 38);
	process.env.PI_OPENSPEC_STATUS_WIDTH = "not-a-width";
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => h.count("list") === 2);
	assert.equal(visibleWidth(h.widgets.at(-1)![0]!), 120);
	Object.defineProperty(process.stdout, "columns", { value: 25, configurable: true });
	await h.emit("turn_end");
	t.mock.timers.tick(500);
	await waitFor(() => h.count("list") === 3);
	assert.equal(visibleWidth(h.widgets.at(-1)![0]!), 25);
});
