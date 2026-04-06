---
name: YT
description: Use this skill when an agent needs to operate TailDay YouTrack issues or knowledge base articles through the standalone `yt` CLI or its local API wrapper.
---

# YT

Operate the existing TailDay YouTrack integration through the published `yt` CLI. Do not redesign the integration unless the user explicitly asks for changes in the CLI or API itself.

## Use This Skill When

- You need to read a TailDay issue, subtask tree, or issue metadata.
- You need to create a subtask under an existing issue.
- You need to move an issue through statuses.
- You need to add a comment to an issue.
- You need to search for issues with a YouTrack query.
- You need to read, create, update, delete, tag, or link knowledge base articles.
- You need to inspect or update the CLI configuration used for YouTrack access.
- You need to run or verify the `TAILDAY-802` integration scenario.

## Working Rules

1. Start with the CLI when the task is operational.
2. Use the programmatic API only when the job needs composition, branching logic, or cleanup handling.
3. Prefer the published `yt` command. Use `./yt` only when working inside the CLI repository itself.
4. Before live operations, verify configuration with `yt config resolved` if auth or base URL is in doubt.
5. Do not invent custom-field names. Read them from `yt_params_schema.js`.
6. Do not assume generic YouTrack statuses map 1:1 to TailDay statuses.
7. If a task mutates live data for verification, clean up disposable artifacts unless the user explicitly asks to keep them.

## TailDay-Specific Facts

- Project name: `TailDay`
- Status field name: `Stage`
- Priority field name: `Priority`
- Estimate field name: `Оценка`
- Time spent field name: `Затраченное время`
- Assignee field name: `Assignee`

The TailDay project uses real stage values from YouTrack. Requested statuses are resolved against the actual bundle. For example, `Open` currently resolves to `Backlog`.

## Configuration

The CLI supports persistent per-user config and one-off overrides.

Preferred checks:

```bash
yt config resolved
yt config list
yt config path
```

Typical setup:

```bash
yt config set token "perm-..."
yt config set base-url "https://underogat.youtrack.cloud"
yt config set project "TailDay"
```

One-off overrides:

```bash
yt --token "perm-..." --base-url "https://underogat.youtrack.cloud" get TAILDAY-802
```

Resolution precedence is:

1. CLI flags
2. Shell environment
3. User config file
4. Built-in defaults

## Default Workflow

1. Read the issue first.
2. Read the current subtask tree if hierarchy matters.
3. If creating a subtask or article, use the existing schema and API helpers instead of hand-building payloads.
4. If changing status, verify the current state and apply transitions through the CLI or API.
5. If running verification against live YouTrack, prefer disposable entities and clean them up after the check.

## Issue Commands

```bash
yt get ISSUE
yt get ISSUE --full
yt subtasks ISSUE
yt create-subtask ISSUE --summary "Title" --description "Body"
yt status ISSUE
yt status ISSUE "In Progress"
yt comment ISSUE "Text"
yt search "project: TailDay #Unresolved"
yt scenario TAILDAY-802 --cleanup
```

By default `yt get` returns a short normalized payload. Pass `--full` when status, assignee, comments, custom fields, or hierarchy data matter.

## Article Commands

```bash
yt article ARTICLE_ID
yt articles
yt create-article --summary "Title" --content "Body" [--tag "name"] [--project PROJECT]
yt update-article ARTICLE_ID --summary "New Title" --content "New Body"
yt delete-article ARTICLE_ID
yt tag-article ARTICLE_ID "tag-name" ["tag2" ...]
```

## Child Article Commands

```bash
yt child-articles ARTICLE_ID
yt create-child-article PARENT_ID --summary "Title" [--content "Body"] [--tag "name"]
yt link-child-article PARENT_ID CHILD_ID
```

Article IDs follow the format `PROJECT-A-NUMBER`, for example `TAILDAY-A-35`.

## Config Commands

```bash
yt config path
yt config list
yt config resolved
yt config get token
yt config set token "perm-..."
yt config set base-url "https://underogat.youtrack.cloud"
yt config unset token
yt config init --token "perm-..." --base-url "https://underogat.youtrack.cloud" --project TailDay
```

## Programmatic Entry Points

- `api/index.js`
- `api/youtrack-api.js`
- `tests/scenario.js`

Use the API wrapper when the agent needs:

- retries and normalized errors
- cleanup on failure
- status alias resolution
- multi-step automation
- article workflows
- tag resolution and creation

## Expected Agent Behavior

- Prefer direct terminal commands for one-off issue operations.
- Prefer direct terminal commands for one-off article operations as well.
- Prefer the scenario runner for validating the full integration path.
- Report exact issue IDs, article IDs, and exact status values after mutation.
- When auth/config is missing, tell the user which config key is needed instead of guessing.
- If a live operation fails, surface the normalized error instead of guessing.
- If a temporary issue, subtask, or article was created for testing, remove it unless the user asked to keep it.

## Example Tasks

- Read `TAILDAY-<number>`, summarize status and assignee, and list all subtasks.
- Create a disposable subtask under `TAILDAY-<number>`, move it through the test flow, add a comment, and clean it up.
- Search for all unresolved TailDay issues assigned to a specific user.
- Audit a parent issue hierarchy before creating a release checklist.
- Read article `TAILDAY-A-<number>` and summarize it.
- Create a knowledge base article, tag it, verify it exists, then delete it.
- Link an existing article as a child of another article and verify the relationship.
- Inspect `yt` auth/config state before running live commands on another machine.
