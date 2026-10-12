# Integration validation

## Reviewed inputs

- Fork main: `5663d62e0b304607f77497365e6c70f5029228d5`.
- Upstream main: `64b9ab96152eeaa69f14f37e4618bff9431b4d2d`.
- Common ancestor: `3450bc351ca7ccdefe2a9f3fe874df9512c4708e`.
- Integration uses a two-parent merge; no main reset, release tag or automatic PR merge.

## Local checks

Validation ran on Node.js 24.20.0. Dependency installation ran with lifecycle scripts disabled. Executable checks ran in Bubblewrap with networking disabled, a read-only project/toolchain and temporary writable storage; no credential directories or agent sockets were mounted. No seccomp filter was configured.

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Pass; reproducible final dependency tree |
| `npm run typecheck` | Pass with SDK/TUI 1.1.0 and isolated SDK/TUI 0.99.2 |
| `npm run lint` | Pass; checks every source in extension, test, tests and scripts |
| `npm test` | 124 passed, 0 failed, 1 native-Windows test skipped, for both host pairs |
| Repeat final combined suite three times | All pass |
| OpenSpec 1.14.1 `validate --all --strict --json` | 10 items passed, no failures |
| Real OpenSpec 1.14.1 data-layer smoke | CLI available; both active changes produced validated details and task entries without errors |
| `npm pack --dry-run --json --ignore-scripts` | Approved extension/package/license/README publication set only |
| `npm audit --json` | Final SDK/TUI 1.1.0 development tree has zero reported vulnerabilities |
| Registry currency check | SDK/TUI 1.1.0, cross-spawn 7.0.6, declarations 6.0.6 and OpenSpec 1.14.1 are current stable versions |

Both fork `test/` and imported upstream `tests/` suites are included in standard validation. The lint command invokes one syntax check per file, using Node's type-stripping parser before ESM syntax checking; unlike the old multi-file `node --check` invocation, later files are not silently ignored. Node emits its expected experimental type-stripping API warning.

## Preservation and compatibility decisions

- Preserve CLI validation, generic bounded errors, canonical task containment, UI sanitization, safe editor actions, last-known-safe state, retained prompt aliases and trust/scope guidance in all seven skills.
- Retain fork package identity/version, publication allowlist, governance files, workflow permissions and pinned Actions.
- The maintainer approved widening both Pi peer ranges to `>=0.80.0 <2.0.0`. Node requirements of the host still apply. The extension's previous lower bounds are retained; the representative legacy compatibility check uses 0.99.2, not every historical peer version.
- The older SDK's published shrinkwrap pins a publicly advised vulnerable development dependency. Normal updates, audit fix and overrides could not replace it. The final branch uses clean-auditing SDK/TUI 1.1.0 without ineffective overrides. The isolated legacy fixture retains that known dependency only to test compatibility; passing its behavior tests does not certify the security of an older host installation.
- Normalize headings/purposes in four pre-existing main specs for strict current-CLI validation; leave their requirements unchanged.
- Delta specs are synced. Keep this completed integration change active for PR review, then archive after acceptance. Do not alter the separate incomplete Scorecard follow-up.

## Remaining validation limits

The native Windows npm-shim test is skipped on Linux. Windows launcher selection/caching, timeout/cancellation and literal argument handling are tested, but native cmd/taskkill behavior still needs Windows execution. No live TUI or Pi-web smoke session was run. Path containment checks are not a guarantee against all concurrent hostile filesystem races. GitHub CI and independent PR review remain publication-time gates, not implied by these local results.
