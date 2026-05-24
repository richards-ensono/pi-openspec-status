## 1. Types and data model

- [ ] 1.1 Add `TaskGroup` interface to `extension/types.ts` with fields: `name: string`, `completed: number`, `total: number`, `status: 'complete' | 'partial' | 'none' | 'empty'`
- [ ] 1.2 Add `taskGroups` field to `WidgetState` interface in `extension/types.ts`: `taskGroups: Map<string, TaskGroup[]>`

## 2. Task group parser

- [ ] 2.1 Create `extension/tasks-parser.ts` with `parseTaskGroups(content: string): TaskGroup[]` function
- [ ] 2.2 Implement `##` heading detection to identify group boundaries
- [ ] 2.3 Implement per-group checkbox counting (`- [x]` vs `- [ ]`) within each heading section
- [ ] 2.4 Derive per-group `status` from completed/total counts (`complete`, `partial`, `none`, `empty`)
- [ ] 2.5 Handle edge cases: pre-heading content (skip), empty file (return `[]`), no `##` headings at all (return `[]`), parse errors (catch + return `[]`)

## 3. Data fetching integration

- [ ] 3.1 Add `fetchTaskGroups(changeDir: string): TaskGroup[]` to `extension/openspec.ts` that reads `tasks.md` from the change directory and calls the parser
- [ ] 3.2 Wrap the call in try/catch; return empty array on any failure (file missing, read error, parse error)
- [ ] 3.3 Integrate into `fetchActiveChanges()` — populate `taskGroups` alongside `details` in the returned map
- [ ] 3.4 Store result in `WidgetState.taskGroups` during the `refresh()` function in `index.ts`

## 4. Widget: remove apply suffix

- [ ] 4.1 In `extension/widget.ts` `renderSingleChange()`, remove the `applyHint` variable and its interpolation on line 3
- [ ] 4.2 Line 3 should render as `Tasks: <progressBar>` with no suffix

## 5. Overlay: task group rendering

- [ ] 5.1 In `extension/overlay.ts` `renderPreviewPane()`, remove the `applyHint` construction
- [ ] 5.2 Create a new helper `renderTaskGroups(th: Theme, groups: TaskGroup[], innerW: number): string[]` that renders each group on a line: `  icon groupName: completed/total` (or `icon groupName: — no tasks` for empty groups)
- [ ] 5.3 In `renderPreviewPane()`, check for task group data: if groups present and non-empty, call `renderTaskGroups`; otherwise render the flat fallback line `Tasks: <progressBar>` (no apply suffix)
- [ ] 5.4 Update `OpenSpecOverlay` constructor to accept task group data alongside existing `details` parameter
- [ ] 5.5 Pass `taskGroups` from `interaction.ts` through to the `OpenSpecOverlay` constructor

## 6. Verify and polish

- [ ] 6.1 Manually test with an active change that has tasks.md with multiple `##` groups — verify group breakdown appears in overlay preview
- [ ] 6.2 Test with an active change that has tasks.md but no `##` headings — verify flat fallback renders
- [ ] 6.3 Test with no active changes — verify empty state still works
- [ ] 6.4 Test widget in narrow terminals (<80 cols) — verify no regressions from removing apply suffix
- [ ] 6.5 Verify overlay scrolled view works with additional group lines
