# TailDay YouTrack CLI

## Для чего это

`yt` это CLI для работы с TailDay YouTrack и базой знаний. Инструмент в первую очередь сделан для ИИ-агентов, которые должны безопасно и предсказуемо читать задачи, строить дерево подзадач, менять статусы, оставлять комментарии, искать задачи и работать со статьями knowledge base.

Обычному пользователю не нужно глубоко разбираться в том, как внутри устроен API-слой. Практически все, что важно для запуска, это:

1. установить CLI;
2. настроить доступ к YouTrack;
3. установить Codex skill для этого инструмента.

Если ваша цель именно использовать `yt` из Codex, основной фокус должен быть на установке и конфигурации. Внутреннее устройство `api/` имеет смысл изучать только если вы собираетесь дорабатывать сам инструмент.

## Быстрый старт

Установка CLI:

```bash
brew install TailDayDev/tap/yt
```

Создание токена YouTrack:

1. В левом нижнем углу YouTrack нажмите на свой профиль и откройте `Профиль`.
2. Перейдите в раздел `Безопасность аккаунта`.
3. В блоке `Токены` нажмите `Новый токен...`.
4. Создайте постоянный токен с доступом к `YouTrack`.
5. Скопируйте полученное значение `perm-...` и сохраните его. Дальше этот токен нужен для команды `yt config set token ...`.

Подсказка по интерфейсу:

- Переход в профиль: [`Screenshot 2026-04-06 at 10.31.05.png`](./Screenshot%202026-04-06%20at%2010.31.05.png)
- Раздел безопасности и токены: [`Screenshot 2026-04-06 at 10.31.36.png`](./Screenshot%202026-04-06%20at%2010.31.36.png)

Настройка доступа:

```bash
yt config set token "perm-..."
yt config set base-url "https://underogat.youtrack.cloud"
yt config set project "TailDay"
yt config resolved
```

Установка skill в Codex:

```bash
mkdir -p ~/.codex/skills/yt
cp /opt/homebrew/opt/yt/libexec/skills-codex/yt/SKILL.md ~/.codex/skills/yt/SKILL.md
```

Если вы работаете не из `brew`, можно взять skill прямо из репозитория:

```bash
mkdir -p ~/.codex/skills/yt
cp skills-codex/yt/SKILL.md ~/.codex/skills/yt/SKILL.md
```

После этого Codex сможет использовать `yt` как специализированный skill для работы с TailDay YouTrack.

Standalone TailDay YouTrack CLI distributed as the `yt` command.

## Structure

```text
.
├── yt
├── api
├── config
├── skills-codex
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

Persistent CLI config:

```bash
yt config set token "perm-..."
yt config set base-url "https://underogat.youtrack.cloud"
yt config set project "TailDay"
yt config list
```

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
- Precedence is: command flags -> shell env -> user config file -> defaults.
- `YOUTRACK_BEARER_TOKEN` is read from env first, then `YT_BEARER_TOKEN`, then `yt config` storage.
- The base URL is read from env first and then falls back to `yt config` or `config/index.js`.
- User config is stored at `~/.config/tailday/yt.json` unless `XDG_CONFIG_HOME` is set.

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

Global overrides:

```bash
yt --token "perm-..." --base-url "https://underogat.youtrack.cloud" get TAILDAY-802
yt --project TailDay --timeout-ms 30000 search "#Unresolved"
```

Config commands:

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

## Codex Skill

В репозитории skill лежит в Codex-совместимом виде:

```text
skills-codex/yt/SKILL.md
```

Если вы хотите, чтобы агент автоматически подхватывал этот workflow, установите этот файл в `~/.codex/skills/yt/SKILL.md`.

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

`skills-codex/yt/SKILL.md` defines the Codex skill for this CLI. Use it when a Codex agent should manipulate issues, inspect hierarchies, work with knowledge base articles, or run regression-style task orchestration against YouTrack.
