# pi-openspec-status

A [pi](https://pi.dev) coding agent extension that displays the active OpenSpec change status as a persistent TUI widget above the editor.

## Features

- **All active changes** — Shows every change under `openspec/changes/` (one line each)
- **Artifact completion** — Displays check/circle icons for `proposal`, `design`, `tasks`, and `specs/` artifacts with a file count
- **Task counter** — Shows completed/total tasks per change
- **Footer status** — Aggregate task progress when multiple changes are active
- **Auto-refresh** — Updates on session start, after each LLM turn, when the agent finishes, and immediately when edit/write tools touch files under `openspec/changes/`

## Install

```bash
pi install git:github.com/mattoopie/pi-openspec-status
```

Or with a specific version:

```bash
pi install git:github.com/mattoopie/pi-openspec-status@v0.1.0
```

## Usage

Once installed, the widget appears automatically when you're in a project that has an `openspec/changes/` directory with active change subdirectories.

### Requirements

- A project using [OpenSpec](https://github.com/fission-ai/openspec) with changes in `openspec/changes/`
- Each change directory may contain:
  - `.openspec.yaml` — with a `schema` field (optional, defaults to `"spec-driven"`)
  - `proposal.md`, `design.md`, `tasks.md` — artifacts tracked as "done" when present
  - `specs/` — directory tracked as "done" when non-empty

### Display

When no active changes are detected:
```
○ OpenSpec: No active change
```

When changes are active:
```
■ OpenSpec
  feat-auth    ✓proposal ✓design ○tasks ✓specs(3)  3/5 tasks
  fix-login    ✓proposal ○design ○tasks ○specs(1)  1/8 tasks
```

Footer status (single change):
```
○ feat-auth 3/5
```

Footer status (multiple changes):
```
○ 2 changes · 4/13 tasks
```

## Development

```bash
# Clone and install dependencies
git clone https://github.com/mattoopie/pi-openspec-status.git
cd pi-openspec-status
npm install

# Test locally with pi
pi -e ./extension/index.ts
```

## License

MIT
