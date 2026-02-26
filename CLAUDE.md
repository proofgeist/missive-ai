# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CLI tool (`missive`) for the Missive team email/messaging REST API. Optimized for use by Claude Code via Bash — zero MCP context token cost. JSON output by default.

## Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Run CLI via tsx (no build needed)
npx tsc --noEmit       # Type-check without emitting
npm link               # Install `missive` globally from local build
npm test               # Run all tests (vitest)
npm run test:watch     # Run tests in watch mode
npx vitest run src/__tests__/client.test.ts   # Run single test file
```

Run any CLI command during dev without building: `npx tsx src/cli.ts <command>`.

## Architecture

```
src/
├── cli.ts              # Entry point — commander setup, config commands, error handling
├── config.ts           # Token resolution (CLI flag > env var > config file) and config I/O
├── client.ts           # MissiveClient class — all REST calls, MissiveApiError
├── output.ts           # JSON output to stdout, error to stderr
├── types.ts            # Missive API response types (Conversation, Message, Draft, etc.)
└── commands/
    ├── conversations.ts  # list, get, messages, drafts — aliased as "conv"
    ├── drafts.ts         # create (with --send), delete
    └── messages.ts       # get, search — aliased as "msg"
```

**Key patterns:**
- Each command file exports a `register*` function that takes `(program: Command, getClient: () => MissiveClient)`.
- `getClient()` is lazy — only resolves the token when a command actually runs.
- `MissiveClient` wraps native `fetch` with bearer token auth. Returns raw API response shapes.
- No retry logic, no pagination abstraction. Pagination uses `--until <unix_timestamp>`.

## Missive API

- Base URL: `https://public.missiveapp.com/v1/`
- Auth: Bearer token (personal access token, format `missive_pat-...`)
- Token config: `MISSIVE_API_TOKEN` env var, `--token` flag, or `missive config set-token`
- Config stored at: `~/.config/missive-mcp/config.json`
- Pagination: uses `until` (Unix timestamp of last item), not offset. Conversations paginate by `last_activity_at`, messages by `delivered_at`.
- Draft sending: no separate "send" endpoint. Use `missive drafts create --send` which sets `send: true` on creation.
- Draft create body wraps params in a `drafts` key (Missive API convention).

## Adding New Commands

1. Create `src/commands/<resource>.ts` exporting `register<Resource>(program, getClient)`
2. Add client methods to `src/client.ts`
3. Add types to `src/types.ts`
4. Import and call the register function in `src/cli.ts`
