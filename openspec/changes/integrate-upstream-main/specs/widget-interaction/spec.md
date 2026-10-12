## MODIFIED Requirements

### Requirement: Letter key actions on selected change
The user SHALL trigger OpenSpec workflows by pressing a single letter key while the overlay is open. The verify action key SHALL only be active when the exact `opsx-verify` alias or `skill:openspec-verify-change` command is registered in the current pi session (detected via `pi.getCommands()`). The alias SHALL be preferred when both are registered.

#### Scenario: Apply action on selected change
- **WHEN** the user presses `a` while a change is selected
- **THEN** the overlay closes and the editor is pre-filled with `/opsx-apply <change-name>`

#### Scenario: Verify action on selected change when alias is available
- **WHEN** the user presses `v` while a change is selected AND `opsx-verify` is registered via `pi.getCommands()`
- **THEN** the overlay closes and the editor is pre-filled with `/opsx-verify <change-name>`

#### Scenario: Verify action when only the new upstream skill is available
- **WHEN** the user presses `v` while a change is selected AND only `skill:openspec-verify-change` is registered
- **THEN** the overlay closes and the editor is pre-filled with `/skill:openspec-verify-change <change-name>`

#### Scenario: Verify key ignored when not available
- **WHEN** neither exact verify command is registered, even if a similarly named command exists
- **THEN** pressing `v` is ignored (no action taken, overlay remains open)

#### Scenario: Explore action on selected change
- **WHEN** the user presses `e` while a change is selected
- **THEN** the overlay closes and the editor is pre-filled with `/opsx-explore <change-name>`

#### Scenario: Archive action on selected change
- **WHEN** the user presses `c` while a change is selected
- **THEN** the overlay closes and the editor is pre-filled with `/opsx-archive <change-name>`

### Requirement: Action hints displayed
The overlay SHALL display a hint bar showing available action keys and their functions. The verify hint SHALL only appear when one of the exact supported verify commands is registered (detected via `pi.getCommands()`).

#### Scenario: Full hint bar with changes (verify available)
- **WHEN** the overlay is open, active changes exist, AND `opsx-verify` or `skill:openspec-verify-change` is registered
- **THEN** the hint bar shows "a apply · v verify · e explore · c archive · p propose new · esc cancel"

#### Scenario: Full hint bar with changes (verify unavailable)
- **WHEN** the overlay is open, active changes exist, AND neither exact supported verify command is registered
- **THEN** the hint bar shows "a apply · e explore · c archive · p propose new · esc cancel"

#### Scenario: Empty state hint bar
- **WHEN** the overlay shows the empty state
- **THEN** the hint bar shows "p propose new · esc cancel" with other action labels shown in muted/dim style

## ADDED Requirements

### Requirement: Loading overlay disposal
Closing or cancelling the loading overlay SHALL dispose its animation timer. A late data-fetch result SHALL not finish a cancelled interaction again or open the change list.

#### Scenario: Cancel during data fetch
- **WHEN** the user presses escape while change data is being fetched
- **THEN** the loading overlay closes, its animation timer stops, and late fetch results do not change the editor or reopen an overlay
