import assert from "node:assert/strict";
import test from "node:test";
import type { Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { registerInteractionShortcut } from "../extension/interaction.ts";
import { editorCommandForAction, verifyCommandForCommands } from "../extension/actions.ts";
import { createProject, detail, summary } from "./fixtures.ts";

type Component = { render: (width: number) => string[]; handleInput: (data: string) => void; dispose?: () => void };

test("verify command selection uses exact registered commands and validates names", () => {
	assert.equal(verifyCommandForCommands([]), null);
	assert.equal(verifyCommandForCommands([{ name: "skill:not-openspec-verify-malicious" }]), null);
	assert.equal(verifyCommandForCommands([{ name: "skill:openspec-verify-change" }]), "/skill:openspec-verify-change");
	assert.equal(verifyCommandForCommands([{ name: "skill:openspec-verify-change" }, { name: "opsx-verify" }]), "/opsx-verify");
	assert.equal(editorCommandForAction({ type: "verify", changeName: "valid-change" }, "/skill:openspec-verify-change"), "/skill:openspec-verify-change valid-change");
	assert.equal(editorCommandForAction({ type: "verify", changeName: "valid-change" }, "/injected\ncommand" as never), null);
	assert.equal(editorCommandForAction({ type: "verify", changeName: "bad\ncommand" }, "/skill:openspec-verify-change"), null);
});

test("overlay fetches from session cwd and inserts the registered verify skill command", async (t) => {
	const cwd = await createProject(t);
	let handler!: (ctx: unknown) => Promise<void>;
	const calls: string[] = [];
	const editor: string[] = [];
	let customCalls = 0;
	let completions = 0;
	const pi = {
		registerShortcut: (_key: unknown, shortcut: { handler: typeof handler }) => { handler = shortcut.handler; },
		getCommands: () => [{ name: "skill:openspec-verify-change", source: "skill" }],
		exec: async (_command: string, args: string[], options: { cwd: string }) => {
			calls.push(options.cwd);
			return { code: 0, stdout: JSON.stringify(args[0] === "list" ? { changes: [summary()] } : detail()), stderr: "" };
		},
	};
	registerInteractionShortcut(pi as never);
	const ctx = {
		cwd, isIdle: () => true,
		ui: {
			notify: () => assert.fail("Unexpected notification"),
			setEditorText: (text: string) => { editor.push(text); },
			custom: <T>(factory: (tui: TUI, theme: Theme, kb: unknown, done: (value: T) => void) => Component) => new Promise<T>((resolve) => {
				let component: Component | undefined;
				const done = (value: T) => { completions++; component?.dispose?.(); resolve(value); };
				component = factory({ requestRender: () => {} } as never, { fg: (_color: string, text: string) => text } as never, {}, done);
				if (++customCalls === 2) component.handleInput("v");
			}),
		},
	};
	await handler(ctx);
	assert.deepEqual(editor, ["/skill:openspec-verify-change fix-issue-42"]);
	assert.equal(customCalls, 2);
	assert.equal(completions, 2);
	assert.equal(calls.every((value) => value === cwd), true);
});

test("cancelling the loading overlay disposes animation and ignores late results", async (t) => {
	t.mock.timers.enable({ apis: ["setInterval"] });
	const cwd = await createProject(t);
	let handler!: (ctx: unknown) => Promise<void>;
	let release!: (value: { code: number; stdout: string }) => void;
	const pending = new Promise<{ code: number; stdout: string }>((resolve) => { release = resolve; });
	let completions = 0;
	let renders = 0;
	let customCalls = 0;
	const pi = {
		registerShortcut: (_key: unknown, shortcut: { handler: typeof handler }) => { handler = shortcut.handler; },
		exec: async (_command: string, args: string[]) => args[0] === "list" ? pending : { code: 0, stdout: JSON.stringify(detail()) },
	};
	registerInteractionShortcut(pi as never);
	const ctx = {
		cwd, isIdle: () => true,
		ui: {
			custom: <T>(factory: (tui: TUI, theme: Theme, kb: unknown, done: (value: T) => void) => Component) => new Promise<T>((resolve) => {
				customCalls++;
				let component: Component | undefined;
				const done = (value: T) => { completions++; component?.dispose?.(); resolve(value); };
				component = factory({ requestRender: () => { renders++; } } as never, {} as never, {}, done);
				component.handleInput("\x1b");
			}),
		},
	};
	await handler(ctx);
	release({ code: 0, stdout: JSON.stringify({ changes: [summary()] }) });
	for (let i = 0; i < 20; i++) await new Promise<void>((resolve) => setImmediate(resolve));
	t.mock.timers.tick(1000);
	assert.equal(renders, 0, "disposed loading overlay must not keep its animation interval");
	assert.equal(completions, 1, "late fetch result must not finish an already cancelled overlay");
	assert.equal(customCalls, 1);
});
