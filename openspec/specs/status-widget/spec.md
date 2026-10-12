# status-widget Specification

## Purpose
Display a status widget for active OpenSpec changes. This enables the user to quickly see what is being worked on and how much is completed for that change.

## Requirements
### Requirement: Widget visibility
The extension SHALL display a widget above the pi editor in interactive mode. In non-interactive modes (`-p`, `--json`, RPC without UI), the widget SHALL be suppressed.

#### Scenario: Interactive session starts in OpenSpec project
- **WHEN** pi starts an interactive session in a directory containing `openspec/changes/` with active changes
- **THEN** the widget appears above the editor showing active change status

#### Scenario: No active changes
- **WHEN** pi starts in an OpenSpec project with no active (non-archived) changes
- **THEN** the widget displays a single line: "No active OpenSpec changes"

#### Scenario: Non-interactive mode
- **WHEN** pi runs in print mode (`-p` flag) or JSON mode
- **THEN** the widget does not render

### Requirement: Single change display
When exactly one active change exists, the widget SHALL render three lines showing detailed information.

#### Scenario: Single active change with full artifacts
- **WHEN** one active change named "add-auth" has all artifacts done (proposal, design, specs, tasks) and 3 of 7 tasks completed
- **THEN** line 1 shows the change name, schema name, and an overall status icon (✓ for complete, ◷ for in-progress)
- **AND** line 2 shows each artifact name with a status icon (● done, ○ ready, ◌ blocked), separated by at least one space
- **AND** line 3 shows a task progress bar with completed/total count

#### Scenario: Single active change with partial artifacts
- **WHEN** one active change has proposal done, design blocked, specs ready, tasks ready
- **THEN** line 2 shows "proposal● design◌ specs○ tasks○" with appropriate status icons and at least one space between each artifact

### Requirement: Multiple change display
When more than one active change exists, the widget SHALL render each change on a single condensed line with a header line showing the count.

#### Scenario: Two active changes
- **WHEN** two active changes exist ("add-auth" complete with 3/7 tasks, "bugfix" in-progress with 0/0 tasks and blocked design)
- **THEN** line 1 shows a header "OpenSpec (2 active)"
- **AND** line 2 shows for "add-auth": status icon, name, "PDS T" artifact initials with fill indicators, and "3/7" task counter
- **AND** line 3 shows for "bugfix": status icon, name, artifact initials, "0/0" task counter, and blocked dependency hint

#### Scenario: More changes than vertical space
- **WHEN** the number of active changes exceeds available vertical space
- **THEN** all changes are still rendered (the widget scrolls naturally with the TUI)

### Requirement: Artifact status display
Each artifact from the OpenSpec schema SHALL be represented by its full name (single-change mode) or initial letter capitalized (multi-change mode: P=proposal, D=design, S=specs, T=tasks) paired with a status icon.

#### Scenario: Artifact done
- **WHEN** an artifact status is "done"
- **THEN** it displays ● (filled circle) in theme success color

#### Scenario: Artifact ready
- **WHEN** an artifact status is "ready"
- **THEN** it displays ○ (open circle) in theme muted color

#### Scenario: Artifact blocked
- **WHEN** an artifact status is "blocked"
- **THEN** it displays ◌ (dotted circle) in theme warning color

### Requirement: Data refresh
The widget SHALL refresh its display when relevant state changes occur. Refresh sources SHALL share a non-overlapping coordinator and coalesce events arriving during a fetch. Detailed status SHALL be fetched only when the validated list fingerprint changes or the previous detail fetch failed.

#### Scenario: Session start
- **WHEN** the `session_start` event fires
- **THEN** the widget fetches active changes from `openspec list --json` and per-change status from `openspec status --json`

#### Scenario: Agent turn ends
- **WHEN** the `turn_end` event fires
- **THEN** the widget checks for changes after a 500ms debounce

#### Scenario: Agent processing ends
- **WHEN** the `agent_end` event fires
- **THEN** the widget checks for changes after a 500ms debounce

#### Scenario: Tool writes to openspec directory
- **WHEN** a `tool_result` event indicates a `write` or `edit` tool touched a file under `openspec/` using either path separator
- **THEN** the widget checks for changes after a 500ms debounce and resets fallback backoff after a successful refresh

#### Scenario: Shell command mentions openspec
- **WHEN** a `tool_result` event for a `bash` or `powershell` tool contains a command string mentioning "openspec"
- **THEN** the widget checks for changes after a 500ms debounce and resets fallback backoff after a successful refresh

#### Scenario: Periodic fallback refresh
- **WHEN** the agent is idle and no refresh is active
- **THEN** fallback polling starts at 30 seconds and backs off by 30 seconds per unchanged successful check to at most 120 seconds
- **AND** a changed successful snapshot resets polling to 30 seconds

#### Scenario: Events during an active refresh
- **WHEN** multiple refresh events arrive during an active fetch
- **THEN** they are coalesced into one pending refresh rather than overlapping the active fetch

#### Scenario: Unchanged validated list
- **WHEN** the list fingerprint matches the last successful detail snapshot
- **THEN** the widget retains cached details without repeating status requests

#### Scenario: Invalid detail snapshot
- **WHEN** a detail fetch fails validation or execution
- **THEN** the widget retains any last known safe state with a bounded error indicator
- **AND** the failed snapshot is not cached as successful

### Requirement: Dynamic width adaptation
The widget SHALL adapt its layout to the available render width. When stdout does not provide a usable terminal width, the extension SHALL use a positive integer from `PI_OPENSPEC_STATUS_WIDTH`, or default to 120 columns.

#### Scenario: Full artifact names fit in multi-change mode
- **WHEN** every multi-change row fits with full artifact names at an available width of at least 80 columns
- **THEN** artifact names are displayed in full on every row
- **AND** change names occupy a padded column so artifact labels align

#### Scenario: Full artifact names do not fit in multi-change mode
- **WHEN** any multi-change row exceeds the available width with full artifact names, or the available width is below 80 columns
- **THEN** artifact names are abbreviated to initials on every row
- **AND** change names occupy a padded column so artifact labels align

#### Scenario: Wide terminal (≥120 cols)
- **WHEN** the terminal width is 120 columns or more
- **THEN** a progress bar is shown in single-change mode

#### Scenario: Narrow terminal (<80 cols)
- **WHEN** the terminal width is below 80 columns
- **THEN** artifact names are abbreviated to initials in all modes
- **AND** the progress bar is replaced with a compact "N/M" counter in single-change mode
- **AND** change names are truncated to fit

### Requirement: Error resilience
The widget SHALL handle error states gracefully without crashing or disrupting the pi session.

#### Scenario: OpenSpec CLI not installed
- **WHEN** the `openspec` command is not available on PATH
- **THEN** the widget displays "OpenSpec CLI not found" on a single line

#### Scenario: Not an OpenSpec project
- **WHEN** the `openspec list --json` command fails because no OpenSpec project is found in the resolved directory (current working directory or git root fallback)
- **THEN** the widget does not render (no-op)

#### Scenario: CLI invocation fails
- **WHEN** an `openspec` CLI call fails with a non-zero exit code
- **THEN** the widget retains its last known state and displays a muted error indicator

#### Scenario: CLI diagnostics contain untrusted text
- **WHEN** an `openspec` CLI call fails with a non-zero exit code and writes diagnostics to stdout or stderr
- **THEN** the widget shows a bounded generic error without reflecting untrusted CLI diagnostics

### Requirement: Validated OpenSpec status data
The extension SHALL validate OpenSpec CLI summaries and status details before using them for state, filesystem access, command construction, or rendering. Change identifiers SHALL conform to the documented supported identifier grammar and SHALL reject path separators, traversal segments, control characters, bidirectional controls, and leading or trailing whitespace.

#### Scenario: CLI returns a traversal-style change name
- **WHEN** `openspec list --json` returns a change name containing `../` or a path separator
- **THEN** the extension SHALL not use that name for status lookup, task-file access, state keys, rendering, or actions
- **AND** the extension SHALL surface a bounded safe error state

#### Scenario: CLI returns malformed status data
- **WHEN** a CLI response has an invalid identifier, artifact status, or task counter
- **THEN** the extension SHALL reject the malformed entry rather than rendering or acting on it
- **AND** the extension SHALL retain any last known safe widget state when available

### Requirement: Safe rendering of external status text
Before terminal rendering, the extension SHALL sanitize CLI-derived change names, schema names, artifact identifiers, task-group names, and error messages into bounded plain display text. Sanitization SHALL remove terminal escape sequences, C0/C1 controls, line controls, and Unicode bidirectional formatting controls before Pi theme styling is applied.

#### Scenario: CLI returns terminal control sequences
- **WHEN** a CLI-derived label contains ANSI, OSC, carriage-return, newline, or bidirectional control sequences
- **THEN** the widget and overlay SHALL render only the sanitized plain-text representation
- **AND** the supplied value SHALL not create, hide, overwrite, or reorder visible UI content

### Requirement: Workflow-completion semantics
The widget SHALL describe OpenSpec completion as workflow or artifact completion and SHALL not represent it as a security review, test result, or independent verification.

#### Scenario: Change is reported complete
- **WHEN** OpenSpec reports `isComplete: true`
- **THEN** the widget SHALL present the completed workflow state
- **AND** the widget SHALL not claim that tests, verification, or security review succeeded

### Requirement: Session-scoped resolution and lifecycle
The widget and overlay SHALL use the Pi session cwd rather than the hosting process cwd. Cached directory resolution SHALL be scoped to normalized cwd. Work from a replaced or shut-down session SHALL not update the current widget, and shutdown SHALL cancel pending refresh timers.

#### Scenario: Multiple hosted projects
- **WHEN** sessions use different project directories within one hosting process
- **THEN** each session resolves its own OpenSpec root and requests CLI data from that project

#### Scenario: Session replacement during a fetch
- **WHEN** an old session's pending fetch finishes after a new session starts
- **THEN** the old result does not replace the new session's widget

#### Scenario: Shutdown with pending refresh
- **WHEN** the session shuts down while debounce or fallback timers are pending
- **THEN** pending timers are cleared and late data does not update the UI

### Requirement: Supported Pi host versions

The extension SHALL declare compatible Pi Coding Agent and TUI peers in the range `>=0.80.0 <2.0.0`, retaining the previous lower bound while allowing Pi 1.x. Development validation SHALL cover the current stable Pi 1.x pair and a representative legacy pair. The host's own Node.js requirements SHALL still apply.

#### Scenario: Current Pi 1.x host
- **WHEN** the extension is loaded with the current stable Pi 1.x Coding Agent and TUI packages
- **THEN** type checking and regression tests succeed with the approved development dependency tree

#### Scenario: Legacy host compatibility
- **WHEN** the same extension implementation is validated with the legacy Pi 0.99.2 Coding Agent and TUI pair
- **THEN** type checking and behavioral regressions continue to pass

