# Scorecard remediation closeout

## Review and scope

The maintainer approved these closeout findings, deferred-governance decisions, delta-spec synchronization and archival on 2026-10-12. This completes task 5.4; it does not certify that every Scorecard check passes or that the repository has no vulnerabilities.

The original implementation remediated actionable workflow-permission and licensing findings, added meaningful property tests, and documented findings that need governance capacity, repository age or external participation rather than code-only changes.

## Evidence reviewed

- Initial closeout review: [Scorecard run 37774401242](https://github.com/richards-ensono/pi-openspec-status/actions/runs/37774401242), successful on 2026-10-08 at main commit `5663d62e0b304607f77497365e6c70f5029228d5`; reviewed SARIF analyses `1915489192`, `1915489172` and `1915489156`.
- Before committing the archive, reviewed the newer [Scorecard run 38223579106](https://github.com/richards-ensono/pi-openspec-status/actions/runs/38223579106), successful on 2026-10-12 after PR #19 merged.
- Latest analyzed main commit: `03b9ad327b413934981ab4a504b8a4a3c4854d98`. Its SARIF analyses are `1934797903`, `1934797876` and `1934797859`; the vulnerability category contains no findings, while the four original deferred checks remain reported.
- GitHub now marks vulnerability follow-up alert #9 fixed, with `fixed_at: 2026-10-12T08:27:07Z`.
- Verified main's active rules include deletion prevention, non-fast-forward prevention, required signatures, pull requests and required status checks. No GitHub settings or alert dispositions were changed by this closeout.

## Original findings

| Alert | Finding | Observed state | Closeout decision |
| --- | --- | --- | --- |
| #2 | CodeQL global token permissions | Fixed on 2026-07-17 | Resolved by read-only workflow defaults and job-scoped upload permission. |
| #3 | Publishing workflow permission default | Fixed on 2026-07-17 | Resolved by explicit read-only defaults with publication-only OIDC elevation. |
| #4 | License detection | Fixed on 2026-07-17 | Resolved; preserve the canonical root MIT license and confirmed attribution. |
| #8 | Fuzzing recognition | Fixed on 2026-07-17 | Resolved; preserve directly imported fast-check property tests in normal verification. |
| #1 | BranchProtection | Previously dismissed; latest SARIF still reports score 3 | Intentionally deferred under the documented single-maintainer model. Reassess independent approvals, CODEOWNERS enforcement, last-push approval and other stricter controls when maintenance capacity changes. |
| #5 | CodeReview | Previously dismissed; latest SARIF still reports score 0 | Intentionally deferred until genuine independent review evidence is available. Do not fabricate approval history. |
| #6 | Maintained | Previously dismissed; latest SARIF still reports score 0 for repository age | Time-bound follow-up, not a resolved check. Reassess after the fork's actual 90-day threshold. |
| #7 | CIIBestPractices | Previously dismissed; latest SARIF still reports score 0 | Optional separate governance initiative when an owner and maintenance capacity are available. |

“Dismissed” describes an existing GitHub alert disposition, not a passing Scorecard result. The four remaining original findings stay explicitly documented as deferred.

## Follow-ups retained after archive

1. **Repository-age reassessment:** GitHub records this fork's creation as `2026-07-16T08:52:15Z`, making its 90-day threshold `2026-10-14T08:52:15Z`. Owner `richards-ensono` will review a fresh Scorecard result on or after **2026-10-15**. This supersedes the previous planned 2026-07-30 date, which was before the fork was eligible. Passing the age threshold alone does not guarantee a passing maintenance score.
2. **Vulnerability follow-up alert #9 resolved before commit:** The initial review observed three advisories (`GHSA-6j4f-fj2g-mc7p`, `GHSA-q2hr-2g5m-vwhr`, `GHSA-qhr7-859c-m2p7`) and Scorecard vulnerability score 7. This was not one of the original eight findings. [PR #19](https://github.com/richards-ensono/pi-openspec-status/pull/19) subsequently merged through the protected-branch process on 2026-10-12. A fresh successful Scorecard run on its main-branch merge commit reports no vulnerability findings, and GitHub marks alert #9 fixed. The follow-up is therefore recorded as resolved by observed post-merge evidence, not merely by the PR's existence. This archival operation did not merge that PR or manually change any alert disposition.
3. **Governance capacity:** Reassess the deferred review/protection findings if independent maintainers become available; retain existing safeguards meanwhile. Best Practices participation remains a separately owned optional initiative.

## Specification synchronization

The CodeQL/permission-default and governance-reassessment deltas were synchronized into their existing main specs. The new input-boundary-property-testing and repository-license-identification capabilities were promoted into main specs. All six delta requirement blocks match the main specs; unrelated requirements were preserved, and meaningful purpose sections support current OpenSpec validation.

Before archive, all four affected main specs and the change passed strict OpenSpec 1.14.1 validation. All 15 implementation/review tasks are complete. Validation here is scoped to this change and its four capabilities; it is not a claim that every unrelated legacy spec or repository security check passes.
