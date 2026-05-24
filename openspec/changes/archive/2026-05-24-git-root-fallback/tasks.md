## 1. Directory Resolution

- [x] 1.1 Create `resolveOpenSpecDir()` function in `extension/openspec.ts` that returns the resolved `openspec/changes` path or null
- [x] 1.2 Check current working directory: use `pi.exec("test", ["-d", "openspec/changes"])` to verify existence, return `process.cwd()` if found
- [x] 1.3 Implement git root fallback: run `git rev-parse --show-toplevel` via `pi.exec`, validate `openspec/changes` exists at that path, return the git root dir
- [x] 1.4 Validate resolved path: after resolution, confirm `openspec/changes/` exists at the chosen directory, return null if not
- [x] 1.5 Add module-level cache: call `resolveOpenSpecDir()` once lazily, cache the result, expose via `getOpenSpecDir()` that returns cached or resolves on first call

## 2. Wire Resolution into CLI Commands

- [x] 2.1 Update `execOpenSpecJson` to accept an optional `cwd` parameter and pass it to `pi.exec` when set
- [x] 2.2 Update `listChanges` to pass the resolved directory as `cwd` to `execOpenSpecJson`
- [x] 2.3 Update `getChangeStatus` to pass the resolved directory as `cwd` to `execOpenSpecJson`
- [x] 2.4 Update `fetchTaskGroups` to construct the file path using the resolved directory: `<resolvedDir>/<changeName>/tasks.md`

## 3. Error Handling & Edge Cases

- [x] 3.1 Handle git command failure (non-zero exit, timeout, not installed): return null so resolution falls through to no-project state
- [x] 3.2 Handle git success but no `openspec/changes` at git root: return null (same as not an OpenSpec project)
- [x] 3.3 Verify existing error states are preserved: "OpenSpec CLI not found" still shows when CLI is missing, widget is empty when no project exists
- [x] 3.4 Verify subdirectory scenario: launch pi from `openspec/changes/<name>/`, widget still shows active changes using git root fallback
- [x] 3.5 Verify project root regression: launching from git root works exactly as before with no behavior change
