## MODIFIED Requirements

### Requirement: Data is fetched on overlay open
The overlay SHALL fetch fresh change data when it opens, using the same data layer and resolved directory path as the status widget.

#### Scenario: Fresh data on open
- **WHEN** the overlay opens
- **THEN** it calls `fetchActiveChanges()` to get the current state of all changes, using the resolved `openspec/changes` directory (current working directory or git root fallback)
- **AND** displays the result (or an error indicator if the CLI fails)
