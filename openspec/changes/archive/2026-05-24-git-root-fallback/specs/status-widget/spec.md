## MODIFIED Requirements

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
