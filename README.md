# TailDay YouTrack CLI

Standalone TailDay YouTrack CLI distributed as the `yt` command.

## Structure

```text
.
├── yt
├── api
├── config
├── skill
├── tests
├── yt_params_schema.js
└── README.md
```

## Setup

1. `YOUTRACK_BASE_URL` can be provided from env. If omitted, the CLI falls back to `https://underogat.youtrack.cloud`.
2. `YOUTRACK_BEARER_TOKEN` is required unless `YT_BEARER_TOKEN` is set.
3. Optional:
   - `YOUTRACK_LOG_LEVEL=debug`
   - `YOUTRACK_TIMEOUT_MS=20000`
   - `YOUTRACK_MAX_RETRIES=4`

Example:

```bash
export YOUTRACK_BASE_URL="https://your-instance.youtrack.cloud"
export YOUTRACK_BEARER_TOKEN="perm-..."
yt get TAILDAY-802
```

Homebrew install:

```bash
brew install TailDayDev/tap/yt
```

## Auth

- Transport uses `Authorization: Bearer <token>`.
- `YOUTRACK_BEARER_TOKEN` is read from env first, then `YT_BEARER_TOKEN`.
- The base URL is read from env first and falls back to `config/index.js`.

## Commands

Primary entrypoint:

```bash
yt get ISSUE
yt subtasks ISSUE
yt create-subtask ISSUE --summary "Title" --description "Body"
yt status ISSUE
yt status ISSUE "In Progress"
yt comment ISSUE "Text"
yt search "project: TailDay #Unresolved"
yt scenario TAILDAY-802
```

Command notes:

- `get` prints a normalized issue payload.
- `subtasks` prints the subtask tree and the raw normalized structure.
- `create-subtask` creates a new issue in `TailDay`, applies default custom fields, then links it as a subtask.
- `status` without a second argument reads the current status. With a second argument it updates the status.
- `comment` adds a plain-text comment.
- `search` runs a YouTrack query and returns normalized issues.
- `scenario` executes the `TAILDAY-802` integration flow and accepts `--cleanup`.

## Installation

Homebrew:

```bash
brew tap TailDayDev/tap
brew install yt
```

Local development:

```bash
git clone git@github.com:TailDayDev/yt.git
cd yt
./yt help
```

## Architecture

- `config` resolves env, token, and runtime defaults.
- `api/client.js` handles retries, request logging, rate-limit backoff, and error normalization.
- `api/youtrack-api.js` exposes the main wrapper functions:
  - `getIssue`
  - `listSubtasks`
  - `createSubtask`
  - `updateStatus`
  - `addComment`
  - `searchIssues`
- `api/types.d.ts` provides typed response contracts for editor and TypeScript consumers.
- `yt_params_schema.js` is the local TailDay schema source.

## Test Scenario

`tests/scenario.js` automates the requested `TAILDAY-802` flow:

1. Reads issue title, description, status, and assignee.
2. Reads subtask hierarchy.
3. Creates subtask `Тест Таск`.
4. Applies the default status flow `Open -> In Progress -> Done`.
5. Adds the comment `Test automation complete`.

TailDay-specific note:

- The real `Stage` bundle in YouTrack is not a literal `Open -> In Progress -> Done` chain.
- The CLI/API resolves aliases against the actual project states. For example, in the current TailDay project `Open` resolves to `Backlog`.

Run it with:

```bash
yt scenario TAILDAY-802
yt scenario TAILDAY-802 --cleanup
```

## Automated Tests

`tests/yt.integration.test.js` runs a live integration sequence and verifies:

- issue exists
- subtask created
- status changed
- comment added
- cleanup removed the created subtask

The test suite only runs when `YOUTRACK_RUN_LIVE_TESTS=1` is present and the resolved config has a base URL.

Example:

```bash
YOUTRACK_RUN_LIVE_TESTS=1 npx -y jest@29.6.3 tests/yt.integration.test.js --runInBand --config '{"testEnvironment":"node","transform":{}}'
```

## Version

```bash
yt version
```

## Extension Guide

Current extension hooks are intentionally lightweight and live in `api/hooks.js`.

Planned hooks already have stable attachment points for:

- webhook support
- event-driven mode
- git integration
- AI planning layer
- batch migration tool

Add new adapters around those factories instead of rewriting the API layer.

## Skill Integration Guide

`skill/YT.skill.md` defines the local `YT` skill. Use it when a Codex agent should manipulate issues, inspect hierarchies, or run regression-style task orchestration against YouTrack.
