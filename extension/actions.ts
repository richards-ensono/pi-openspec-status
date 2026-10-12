import type { OverlayAction } from "./types.ts";
import { isValidChangeName } from "./validation.ts";

export type VerifyCommand = "/opsx-verify" | "/skill:openspec-verify-change";

/** Prefer an existing alias, otherwise use the exact registered skill command. */
export function verifyCommandForCommands(commands: readonly { name: string }[]): VerifyCommand | null {
	if (commands.some(({ name }) => name === "opsx-verify")) return "/opsx-verify";
	if (commands.some(({ name }) => name === "skill:openspec-verify-change")) return "/skill:openspec-verify-change";
	return null;
}

/** Construct an editor command only from a validated change identifier. */
export function editorCommandForAction(action: OverlayAction, verifyCommand: VerifyCommand = "/opsx-verify"): string | null {
	if (action.type === "propose") return "/opsx-propose ";
	if (action.type === "cancel" || !isValidChangeName(action.changeName)) return null;
	if (action.type === "verify" && verifyCommand !== "/opsx-verify" && verifyCommand !== "/skill:openspec-verify-change") return null;
	const commands = {
		apply: "/opsx-apply",
		verify: verifyCommand,
		explore: "/opsx-explore",
		archive: "/opsx-archive",
	} as const;
	return `${commands[action.type]} ${action.changeName}`;
}
