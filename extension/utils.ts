/**
 * Utility helpers for the OpenSpec Status extension.
 */

/** Check if a tool input references a path under openspec/changes (as a directory segment). */
export function isOpenSpecPath(input: Record<string, unknown>): boolean {
	const candidatePaths: Array<string | undefined> = [
		input.path as string | undefined,
	];
	const edits = input.edits as Array<{ path?: string }> | undefined;
	if (edits) {
		for (const e of edits) candidatePaths.push(e.path);
	}
	return candidatePaths.some(
		(p) => p != null && /(?:^|\/)openspec\/changes(?:\/|$)/.test(p),
	);
}
