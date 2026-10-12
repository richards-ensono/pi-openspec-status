import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import { renderWidget } from "../extension/widget.ts";
import { isOpenSpecRelated } from "../extension/utils.ts";
import { detail, summary } from "./fixtures.ts";

const theme = { fg: (_color: string, text: string) => text } as never;

test("empty widget state respects even very narrow hosted widths", () => {
	for (const width of [1, 20, 25, 120]) {
		assert.equal(renderWidget(theme, [], new Map(), null, width).every((line) => visibleWidth(line) <= width), true);
	}
});

test("multi-change rows align artifact columns and consistently abbreviate at narrow widths", () => {
	const changes = [summary("a"), summary("a-longer-change")];
	const details = new Map(changes.map(({ name }) => [name, detail(name)]));
	const wide = renderWidget(theme, changes, details, null, 120);
	assert.equal(wide[1]!.indexOf("tasks"), wide[2]!.indexOf("tasks"));
	for (const width of [30, 50, 79]) {
		const lines = renderWidget(theme, changes, details, null, width);
		assert.equal(lines.some((line) => line.includes("tasks")), false);
		assert.equal(lines.every((line) => visibleWidth(line) <= width), true);
	}
	const mixedFit = new Map(details);
	mixedFit.set("a-longer-change", { ...detail("a-longer-change"), artifacts: [{ id: "very-long-artifact-name-that-does-not-fit-in-the-row", status: "blocked" }] });
	const lines = renderWidget(theme, changes, mixedFit, null, 80);
	assert.equal(lines[1]!.includes("tasks"), false, "one long row must abbreviate the whole list");
});

test("single-change rendering uses compact narrow counters and workflow labels", () => {
	const changes = [summary()];
	const details = new Map([[changes[0]!.name, detail()]]);
	const wide = renderWidget(theme, changes, details, null, 120);
	assert.match(wide[1]!, /Workflow artifacts: tasks/);
	assert.match(wide[2]!, /OpenSpec task progress:/);
	const narrow = renderWidget(theme, changes, details, null, 40);
	assert.match(narrow[2]!, /1\/2/);
	assert.equal(narrow[2]!.includes("█"), false);
	assert.equal(narrow.every((line) => visibleWidth(line) <= 40), true);
});

test("stale-state rendering keeps safe data and sanitizes all new layout paths", () => {
	const changes = [summary("safe\nforged\u202e"), summary("other\x1b[2J")];
	const details = new Map(changes.map(({ name }) => [name, { ...detail(name), schemaName: "schema\nforged", artifacts: [{ id: "tasks\x1b[2J", status: "blocked" as const }] }]));
	const lines = renderWidget(theme, changes, details, "error\nforged\x1b[2J\u202e", 120);
	assert.equal(lines.some((line) => /[\n\x1b\u202e]/.test(line)), false);
	assert.match(lines[0]!, /⚠/);
	assert.match(lines[1]!, /safeforged/);
	assert.equal(lines.every((line) => visibleWidth(line) <= 120), true);
});

test("OpenSpec-related tool detection supports both separators and shell tools safely", () => {
	for (const path of ["openspec/changes/x/tasks.md", "openspec\\changes\\x\\tasks.md", "C:\\project\\openspec\\changes\\x\\tasks.md", "/project/openspec/changes/x/tasks.md"]) {
		assert.equal(isOpenSpecRelated("write", { path }), true);
		assert.equal(isOpenSpecRelated("edit", { path }), true);
	}
	assert.equal(isOpenSpecRelated("powershell", { command: "openspec status" }), true);
	assert.equal(isOpenSpecRelated("bash", { command: "openspec status" }), true);
	for (const input of [{ path: 42 }, { command: null }, {}, { path: "not-openspec/file" }]) {
		assert.equal(isOpenSpecRelated("write", input), false);
		assert.equal(isOpenSpecRelated("powershell", input), false);
	}
});
