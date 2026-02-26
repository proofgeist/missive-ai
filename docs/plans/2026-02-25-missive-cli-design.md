# Missive CLI & MCP Server Design

## Overview

A CLI tool (`missive`) for interacting with the Missive team email/messaging platform. CLI is the primary interface — optimized for use by Claude Code via Bash (zero context token cost). MCP server mode (`missive serve`) planned as a future addition.

## API Surface

Missive REST API at `https://public.missiveapp.com/v1/`. Auth via personal access tokens (PAT, format: `missive_pat-...`). JSON responses, bearer token auth.

## CLI Commands

Three command groups matching Missive resource types:

### conversations

```
missive conversations list [--mailbox ID] [--label ID] [--team ID] [--limit N] [--offset N]
missive conversations get <id>
missive conversations messages <id> [--limit N] [--offset N]
missive conversations drafts <id>
```

### drafts

```
missive drafts create --to <email> --subject <str> --body <str> [--cc <email>] [--bcc <email>] [--conversation-id <id>]
missive drafts send <draft-id>
missive drafts delete <draft-id>
```

### messages

```
missive messages get <id>
missive messages search --email-message-id <id>
```

### config

```
missive config set-token <token>
missive config show
```

## Architecture

```
src/
├── cli.ts              # Entry point, commander setup
├── client.ts           # MissiveClient — REST wrapper (native fetch)
├── config.ts           # Token resolution & config file management
├── output.ts           # Output formatting (JSON default)
├── types.ts            # Missive API response types
└── commands/
    ├── conversations.ts
    ├── drafts.ts
    └── messages.ts
```

### MissiveClient

Single class wrapping all Missive API calls. Native fetch (Node 18+). Throws `MissiveApiError` with status code and message. Returns raw API response shapes (typed). No retry logic, no pagination abstraction.

### Token Resolution (first wins)

1. `--token` CLI flag
2. `MISSIVE_API_TOKEN` env var
3. `~/.config/missive-mcp/config.json`

### Output

JSON by default (optimized for Claude parsing). Optional `--format table` for human use (future).

## Tech Stack

- TypeScript
- `commander` (CLI framework)
- Native `fetch` (Node 18+)
- No other runtime dependencies

## Build & Dev

- `npm run build` — tsc compilation
- `npm run dev` — tsx for quick iteration
- `npm link` for local installation
- Binary name: `missive`

## Future: MCP Server

`missive serve [--stdio|--sse]` subcommand reusing MissiveClient. Three MCP tools (missive_conversations, missive_drafts, missive_messages) with action parameters. ~700 tokens context budget.
