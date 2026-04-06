---
name: YT
description: Use this skill when an agent needs to work with TailDay YouTrack issues through the local CLI or API in scripts/_youtrack.
---

# YT

This skill is for operating the existing TailDay YouTrack integration, not for creating or redesigning it.

## Use This Skill When

- You need to read a TailDay issue or its subtasks.
- You need to create a subtask under an existing issue.
- You need to move an issue through statuses.
- You need to add a comment to an issue.
- You need to search for issues with a YouTrack query.
- You need to run or verify the `TAILDAY-802` integration scenario.

## Working Rules

1. Start with the CLI when the task is operational.
2. Use the programmatic API only when the job needs composition, branching logic, or cleanup handling.
3. Keep work inside the existing local layer:
   - `./scripts/_youtrack/yt`
   - `scripts/_youtrack/api`
   - `scripts/_youtrack/tests/scenario.js`
4. Do not invent custom-field names. Read them from `scripts/_youtrack/yt_params_schema.js`.
5. Do not assume generic YouTrack statuses map 1:1 to TailDay statuses.

## TailDay-Specific Facts

- Project name: `TailDay`
- Status field name: `Stage`
- Priority field name: `Priority`
- Estimate field name: `Оценка`
- Time spent field name: `Затраченное время`
- Assignee field name: `Assignee`

The TailDay project uses real stage values from YouTrack. Requested statuses are resolved against the actual bundle. For example, `Open` currently resolves to `Backlog`.

## Default Workflow

1. Read the issue first.
2. Read the current subtask tree if hierarchy matters.
3. If creating a subtask, use the local schema defaults.
4. If changing status, verify the current state and apply transitions through the CLI or API.
5. If mutating live issues for a test, clean up disposable artifacts after verification.

## Primary Commands

```bash
./scripts/_youtrack/yt get ISSUE
./scripts/_youtrack/yt subtasks ISSUE
./scripts/_youtrack/yt create-subtask ISSUE --summary "Title" --description "Body"
./scripts/_youtrack/yt status ISSUE
./scripts/_youtrack/yt status ISSUE "In Progress"
./scripts/_youtrack/yt comment ISSUE "Text"
./scripts/_youtrack/yt search "project: TailDay #Unresolved"
./scripts/_youtrack/yt scenario TAILDAY-802 --cleanup
```

## Programmatic Entry Points

- `scripts/_youtrack/api/index.js`
- `scripts/_youtrack/api/youtrack-api.js`
- `scripts/_youtrack/tests/scenario.js`

Use the API wrapper when the agent needs:

- retries and normalized errors
- cleanup on failure
- status alias resolution
- multi-step automation

## Expected Agent Behavior

- Prefer direct terminal commands for one-off issue operations.
- Prefer the scenario runner for validating the full integration path.
- Report exact issue ids and exact status values after mutation.
- If a live operation fails, surface the normalized error instead of guessing.
- If a temporary issue or subtask was created for testing, remove it unless the user asked to keep it.

## Example Tasks

- Read `TAILDAY-<number>`, summarize status and assignee, and list all subtasks.
- Create a disposable subtask under `TAILDAY-<number>`, move it through the test flow, add a comment, and clean it up.
- Search for all unresolved TailDay issues assigned to a specific user.
- Audit a parent issue hierarchy before creating a release checklist.
