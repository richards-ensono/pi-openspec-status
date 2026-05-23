/**
 * TUI rendering for the OpenSpec Status extension.
 *
 * Produces a widget (lines displayed above the editor) and a footer
 * status indicator showing aggregate task progress.
 */

import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { WIDGET_ID, ARTIFACT_NAMES } from "./types.js";
import { getState } from "./state.js";
import { refreshState } from "./state.js";

/** Build widget lines and footer status from current state. */
function renderWidget(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;
	const state = getState();
	const t = ctx.ui.theme;

	if (state.changes.length === 0) {
		ctx.ui.setWidget(WIDGET_ID, [t.fg("dim", "○ OpenSpec: No active change")]);
		ctx.ui.setStatus(WIDGET_ID, undefined);
		return;
	}

	const lines: string[] = [];

	// Header
	lines.push(`${t.fg("accent", "■")} ${t.fg("accent", t.bold("OpenSpec"))}`);

	// One line per active change
	for (const change of state.changes) {
		const parts: string[] = [];

		// Change name
		parts.push(t.fg("text", change.name));

		// Artifact icons + short names (+ spec count)
		for (const artifact of ARTIFACT_NAMES) {
			const status = change.artifacts[artifact];
			const icon = status === "done" ? t.fg("success", "✓") : t.fg("dim", "○");
			parts.push(`${icon}${artifact}`);
		}
		{
			const status = change.artifacts.specs;
			const icon = status === "done" ? t.fg("success", "✓") : t.fg("dim", "○");
			parts.push(`${icon}specs(${change.specCount})`);
		}

		// Task counter
		const { tasks } = change;
		if (tasks.total > 0) {
			parts.push(
				`${t.fg("accent", `${tasks.complete}/${tasks.total}`)} ${t.fg("dim", "tasks")}`,
			);
		} else {
			parts.push(t.fg("dim", "—"));
		}

		lines.push(`  ${parts.join("  ")}`);
	}

	ctx.ui.setWidget(WIDGET_ID, lines);

	// Footer status — aggregate when multiple changes exist
	const totalTasks = state.changes.reduce((sum, c) => sum + c.tasks.total, 0);
	const completeTasks = state.changes.reduce(
		(sum, c) => sum + c.tasks.complete,
		0,
	);

	if (state.changes.length === 1) {
		const c = state.changes[0];
		ctx.ui.setStatus(
			WIDGET_ID,
			`${t.fg("accent", "○")} ${t.fg("dim", c.name)} ${t.fg("accent", `${c.tasks.complete}/${c.tasks.total}`)}`,
		);
	} else {
		ctx.ui.setStatus(
			WIDGET_ID,
			`${t.fg("accent", "○")} ${t.fg("dim", `${state.changes.length} changes · ${completeTasks}/${totalTasks} tasks`)}`,
		);
	}
}

/** Refresh state from disk then re-render the widget and status. */
export async function refreshAndRender(ctx: ExtensionContext): Promise<void> {
	await refreshState(ctx.cwd);
	renderWidget(ctx);
}
