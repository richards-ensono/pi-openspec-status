import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

test("all repository OpenSpec skills and retained aliases state the trust/scope boundary", async () => {
	const skillsRoot = join(process.cwd(), ".pi", "skills");
	const skills = (await readdir(skillsRoot)).filter((name) => name.startsWith("openspec-"));
	const paths = skills.map((name) => join(skillsRoot, name, "SKILL.md"));
	for (const alias of ["apply", "archive", "explore", "propose"]) paths.push(join(process.cwd(), ".pi", "prompts", `opsx-${alias}.md`));
	assert.equal(skills.length, 7);
	for (const path of paths) {
		const text = await readFile(path, "utf8");
		assert.match(text, /## Trust and scope boundary/, path);
		assert.match(text, /untrusted data/, path);
		assert.match(text, /canonicalize the path/, path);
		assert.match(text, /user-approved repository\/change scope/, path);
	}
});

test("fork package identity and validation scripts survive integration", async () => {
	const pkg = JSON.parse(await readFile("package.json", "utf8"));
	const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
	assert.equal(pkg.repository.url, "git+https://github.com/richards-ensono/pi-openspec-status.git");
	assert.equal(pkg.version, lock.packages[""].version);
	assert.equal(pkg.peerDependencies["@earendil-works/pi-coding-agent"], ">=0.80.0 <2.0.0");
	assert.equal(pkg.peerDependencies["@earendil-works/pi-tui"], ">=0.80.0 <2.0.0");
	assert.equal(typeof pkg.scripts.typecheck, "string");
	assert.equal(typeof pkg.scripts.lint, "string");
	assert.equal(typeof pkg.scripts.test, "string");
	assert.equal(pkg.files.includes("extension/"), true);
});
