## Why

The fork and upstream have diverged: upstream adds refresh coordination, layout improvements, session-cwd resolution and Windows CLI support, while the fork adds security boundaries, tests and release governance. Integrate upstream commit `64b9ab96152eeaa69f14f37e4618bff9431b4d2d` without discarding either history or the fork's protections.

## What Changes

- Merge upstream into an integration branch based on fork commit `5663d62e0b304607f77497365e6c70f5029228d5`; leave main unchanged until PR review.
- Adopt coordinated refreshes, stable snapshot detection, adaptive fallback polling, session-cwd resolution, cross-platform filesystem operations and Windows launcher fallback.
- Preserve validated CLI data, canonical task-path containment, safe rendering/actions, last-known-safe state, command aliases, workflow trust guidance and CI/release safeguards.
- Extend regression tests and document the combined behavior; retain fork package identity and run both fork and upstream suites through the validation tooling.
- With maintainer approval, extend Pi/TUI peer support to `>=0.80.0 <2.0.0` and use development SDK/TUI 1.1.0 to avoid the vulnerable dependency pinned by older SDK shrinkwraps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `status-widget`: Specify non-overlapping adaptive refreshes, session isolation, snapshot caching and hosted rendering width.
- `widget-interaction`: Resolve verify actions to an exact registered alias or skill command, and dispose loading animations without accepting late cancelled results.

## Impact

The extension data layer, refresh lifecycle, widget layout, local OpenSpec skills, README and regression tests change. Add registry-verified `cross-spawn` and its TypeScript declarations. Preserve Node runtime support for older compatible hosts while widening the Pi peer ceiling with maintainer approval and using the current stable SDK/TUI development pair. Normalize headings and placeholder purposes in four pre-existing main specs without changing their security/governance requirements. Existing data-layer call signatures remain usable with optional cwd/options defaults. No forced synchronization, release tagging, main-branch push or automatic PR merge is included.
