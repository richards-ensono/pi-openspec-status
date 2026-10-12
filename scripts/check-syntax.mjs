import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";

// node --check accepts one source file; extra paths are treated as its arguments.
// Check each extension/test file so both fork and upstream suites are covered.
for (const directory of ["extension", "test", "tests", "scripts"]) {
	for (const name of readdirSync(directory).sort()) {
		if (!/\.(?:ts|mjs)$/.test(name)) continue;
		const path = join(directory, name);
		// --check does not consistently strip TypeScript, even with the CLI flag.
		// Strip using Node's parser first, then syntax-check as ESM without running it.
		let source = readFileSync(path, "utf8");
		try {
			if (name.endsWith(".ts")) source = stripTypeScriptTypes(source, { sourceUrl: path });
		} catch (error) {
			console.error(`Syntax check failed for ${path}`);
			console.error(error);
			process.exit(1);
		}
		const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
			input: source, encoding: "utf8",
		});
		if (result.error) throw result.error;
		if (result.status !== 0) {
			console.error(`Syntax check failed for ${path}`);
			process.stderr.write(result.stderr);
			process.exit(result.status ?? 1);
		}
	}
}
