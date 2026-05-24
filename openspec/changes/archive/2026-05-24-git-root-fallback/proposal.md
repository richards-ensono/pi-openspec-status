## Why

The OpenSpec status widget and interactive overlay currently assume the working directory is always the project root containing `openspec/changes/`. When pi is launched from a subdirectory of an OpenSpec-governed git repository, the extension fails to detect active changes, showing "OpenSpec CLI not found" or a blank widget. This breaks the extension for users who navigate into subdirectories during a session.

## What Changes

- Add a utility function that resolves the `openspec/changes` directory path: first checking the current working directory, then falling back to the git repository root
- Wire the resolved path into the CLI execution layer so `openspec list` and `openspec status` commands run against the correct directory
- Wire the resolved path into the `fetchTaskGroups` function so `tasks.md` is read from the correct location
- Preserve existing error handling when neither location has `openspec/changes` — the extension continues to show the appropriate error state

## Capabilities

### New Capabilities
- `git-root-fallback`: The extension resolves the `openspec/changes` directory by checking the current working directory first, then the git repository root. This ensures the extension works when pi is launched from any subdirectory within an OpenSpec-governed git repository.

### Modified Capabilities
- `status-widget`: The "Not an OpenSpec project" scenario in the Error resilience requirement is broadened — the widget now also handles the case where `openspec/changes` is missing from both the current directory and the git root (which is the same as the existing behavior, but the resolution logic now checks both locations).
- `widget-interaction`: The overlay's data fetch now uses the same resolved directory path, so it also works from subdirectories.

## Impact

- Affected code: `extension/openspec.ts` (directory resolution and path construction), `extension/utils.ts` (new utility function for git root discovery)
- No API changes — the `pi.exec` and `pi.registerShortcut` APIs are used as before
- No new dependencies — git root discovery uses `git rev-parse --show-toplevel` via existing `pi.exec`
- No breaking changes — the current directory is still checked first, preserving existing behavior
