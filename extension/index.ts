/**
 * OpenSpec Status Widget — Extension Entry Point
 *
 * Displays active OpenSpec changes — artifact status and task progress —
 * as a persistent widget above the editor. One line per active change.
 *
 * Features:
 * - Shows all active changes with artifact completion and task counters
 * - Footer status indicator with aggregate task progress
 * - Event-driven refresh: session_start, turn_end, agent_end
 * - Immediate refresh when edit/write tools modify openspec files
 * - Cleans up UI on session shutdown
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { WIDGET_ID } from "./types.js";
import { refreshAndRender } from "./renderer.js";
import { isOpenSpecPath } from "./utils.js";

export default function (pi: ExtensionAPI): void {
	// Initial load on session start
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		await refreshAndRender(ctx);
	});

	// Refresh after every LLM turn (catches tool-executed task edits)
	pi.on("turn_end", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		await refreshAndRender(ctx);
	});

	// Refresh when agent finishes a user prompt
	pi.on("agent_end", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		await refreshAndRender(ctx);
	});

	// Immediate refresh when edit/write tools touch openspec files
	pi.on("tool_result", async (event, ctx) => {
		if (!ctx.hasUI) return;
		const toolName = event.toolName as string;
		if (
			(toolName === "edit" || toolName === "write") &&
			isOpenSpecPath(event.input as Record<string, unknown>)
		) {
			await refreshAndRender(ctx);
		}
	});

	// Clean up widget and status on shutdown/reload
	pi.on("session_shutdown", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setWidget(WIDGET_ID, []);
		ctx.ui.setStatus(WIDGET_ID, undefined);
	});
}
