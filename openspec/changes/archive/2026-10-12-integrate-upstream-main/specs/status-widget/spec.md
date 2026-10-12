## MODIFIED Requirements

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

## ADDED Requirements

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
