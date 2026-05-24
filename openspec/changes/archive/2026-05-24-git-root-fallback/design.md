## Context

The OpenSpec status widget extension currently uses relative paths (e.g., `openspec/changes/<name>/tasks.md`) for all file reads and invokes `openspec list --json` from the current working directory. This works when pi is launched from the project root but fails silently when launched from a subdirectory.

The extension already uses `pi.exec` for both CLI commands (`openspec`) and file reads (`cat`). We can extend the same pattern to discover the git root.

## Goals / Non-Goals

**Goals:**
- Detect the `openspec/changes` directory from any subdirectory of a git repository
- Check the current working directory first (fast path, no git invocation)
- Fall back to the git root only when the current directory lacks `openspec/changes`
- Preserve all existing error handling behavior
- Cache the resolved base directory to avoid repeated file checks or git invocations

**Non-Goals:**
- Bootstrapping a new `openspec/changes` directory if none exists
- Supporting non-git version control systems (hg, svn)
- Modifying the `openspec` CLI itself
- Changing widget rendering or overlay behavior beyond the directory resolution

## Decisions

### Decision 1: Use `git rev-parse --show-toplevel` for git root discovery

**Rationale**: This is the standard git command for getting the absolute root path. It works regardless of the current working directory, returns a clean absolute path, and exits with non-zero if not in a git repository — making error handling straightforward.

**Alternatives considered**:
- Walking up the directory tree checking for `.git` — fragile (`.git` can be a file in submodules/worktrees), slower for deep directories, reinvents git's own logic.
- Using `git worktree list` or `git rev-parse --git-dir` — less direct, requires path manipulation.

### Decision 2: Try current directory first, then git root

**Rationale**: Avoids unnecessary git invocations for the common case (pi launched from project root). The current directory check is a simple `pi.exec("test", ["-d", "openspec/changes"])` or similar — cheap and immediate. Only when that fails do we run the git command.

### Decision 3: Cache the resolved base directory in module state

**Rationale**: The resolved path doesn't change during a session. A single lazy resolution on first use avoids repeated checks. The cache is reset on `session_start` so a new session re-evaluates.

### Decision 4: Resolve at the data layer, not at CLI invocation time

**Rationale**: The `openspec.ts` module already wraps all CLI interactions. Adding a `resolveOpenSpecDir()` function there and passing it to `listChanges`, `getChangeStatus`, and `fetchTaskGroups` keeps the change contained to one file. The widget and overlay modules are unchanged.

### Decision 5: Pass the base directory as a prefix to openspec CLI calls

**Rationale**: The `openspec` CLI operates on the current directory by default. We can use the `--project` flag if available, or `cd` to the resolved directory before invoking commands. Checking the `openspec --help` output: there may not be a `--project` flag, so we'll use `cwd: resolvedDir` in `pi.exec` options if supported, or prepend `cd <dir> &&` to the command. The `pi.exec` API supports a `cwd` option — this is the cleanest approach.

## Risks / Trade-offs

- **Git not installed**: `git rev-parse` fails. The fallback is to behave exactly as the extension does today — assume current directory. No regression.
- **Not a git repository**: Same as above — falls back to current directory behavior.
- **git rev-parse is slow in large repos**: Mitigated by checking current directory first (fast path) and caching the result so the git command runs at most once per session.
- **Monorepo edge case**: If `openspec/changes` exists in a subdirectory but not in the git root, the fallback won't find it. This is an acceptable trade-off — the git root is the canonical project root. Users can always launch pi from the correct directory.
