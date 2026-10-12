## Context

Upstream main has 16 unique commits and the fork has 13, with 14 merge conflicts. The fork's status-widget, interaction and workflow-trust specs establish security requirements that upstream does not implement. Existing CI validates on Node 24. An unrelated Scorecard change still has a maintainer-only follow-up and must remain untouched.

## Goals / Non-Goals

**Goals:** Preserve both histories and fork protections while adopting upstream refresh coordination, layout, per-session cwd and Windows support. Keep existing public data-layer calls usable. Validate the result before publication.

**Non-Goals:** Force-sync/reset main, change repository governance, publish a release, merge the PR automatically, or complete the unrelated Scorecard follow-up.

## Decisions

- Use a two-parent merge on an isolated integration worktree rather than reset/cherry-pick so future synchronization has the correct common ancestry.
- Use upstream's coordinator and lightweight fingerprints, but reject invalid CLI payloads before any status/filesystem use and retain safe state on list or detail failure. Do not cache failed detail snapshots.
- Replace Unix subprocess task reads with Node filesystem APIs. Validate identifiers before resolution, canonicalize the project/change/task paths and require containment beneath the resolved project's openspec/changes directory. Missing/unsafe paths return no groups.
- Pass session cwd explicitly from widget and overlay; retain process.cwd defaults for existing callers. Cache directory resolution by normalized cwd and reset per session.
- Retain fork rendering sanitization and workflow-progress labels while adopting upstream aligned columns and stale-state indicators.
- Retain /opsx prompt aliases and add the same trust/scope boundary to all newly introduced skills. Resolve verify to /opsx-verify when registered, otherwise the exact /skill:openspec-verify-change command supplied by the new upstream skill. Substring command matches must not enable actions. Dispose the loading component's animation and ignore results after cancellation. Retain fork package identity, validation scripts and CI; add registry-verified cross-spawn and its types using npm.
- Broad audit found a pre-existing high-severity brace-expansion advisory in the development SDK's shrinkwrap. Neither targeted updates, audit fix nor root overrides changed the pinned subtree. The maintainer approved widening Pi/TUI peers to >=0.80.0 <2.0.0 and using stable SDK/TUI 1.1.0, whose isolated dependency tree audits clean. Validate both the previous compatible 0.99.2 host pair and 1.1.0; do not ship ineffective overrides or change the extension's older-host Node floor.

## Risks / Trade-offs

- [Filesystem races] Canonical-path checks do not turn a concurrently hostile writable tree into a fully race-free filesystem boundary; retain current safeguards and use canonical paths for reads.
- [Windows execution] Linux can test injected Windows fallback selection and cancellation contracts, but cannot prove native cmd/taskkill behavior. Record this limitation for review.
- [API/mock changes] Filesystem-backed resolution makes old subprocess mocks obsolete; replace them with temporary real fixtures without weakening assertions.
- [Unbounded upstream concurrency] Status requests run concurrently; retain the upstream behavior for this integration rather than introducing unrelated scheduling abstractions.

## Migration Plan

Validate the merge with Node 24, security/property tests, lifecycle/launcher tests, OpenSpec validation and package-content inspection. Sync the delta specs and keep this integration change active through PR review so any follow-up stays attached to its originating plan; archive it after acceptance. Leave the unrelated Scorecard change untouched. Roll back through a reviewed revert rather than rewriting history.

## Open Questions

None blocking implementation. Native Windows and live hosted-UI smoke tests remain review-time limitations.
