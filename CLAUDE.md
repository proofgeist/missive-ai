# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

CLI tool (`missive`) and MCP server (`missive-mcp`) for the Missive team email/messaging REST API. Two entry points into the same `MissiveClient`:
- **CLI**: `missive` command, JSON output via Bash — zero MCP context token cost
- **MCP server**: `missive-mcp` binary, 17 tools over stdio for direct Claude Code integration

## Project Manifest

See [.atlas/project.yaml](.atlas/project.yaml) for project metadata including GitHub links, tags, and status.

## Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Run CLI via tsx (no build needed)
npm run dev:mcp        # Run MCP server via tsx (no build needed)
npx tsc --noEmit       # Type-check without emitting
npm link               # Install `missive` + `missive-mcp` globally
npm test               # Run all tests (vitest)
npm run test:watch     # Run tests in watch mode
npx vitest run src/__tests__/client.test.ts   # Run single test file
```

Run any CLI command during dev without building: `npx tsx src/cli.ts <command>`.
Run MCP server during dev: `MISSIVE_API_TOKEN=... npx tsx src/mcp.ts`.

## Architecture

```
src/
├── cli.ts              # CLI entry point — commander setup, config commands, error handling
├── mcp.ts              # MCP server entry point — 17 tools over stdio, MISSIVE_API_TOKEN env var
├── config.ts           # Token resolution (CLI flag > env var > config file) and config I/O
├── client.ts           # MissiveClient class — all REST calls, MissiveApiError (shared by CLI + MCP)
├── output.ts           # JSON output to stdout, error to stderr
├── types.ts            # Missive API response types (Conversation, Message, Draft, Contact, etc.)
└── commands/
    ├── conversations.ts  # list, get, messages, drafts, close, reopen, assign, label — aliased as "conv"
    ├── contacts.ts       # list, get, create, update — aliased as "contact"
    ├── contact-books.ts  # list
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
- Config stored at: `~/.config/missive-ai/config.json`
- Pagination: uses `until` (Unix timestamp of last item), not offset. Conversations paginate by `last_activity_at`, messages by `delivered_at`.
- Draft sending: no separate "send" endpoint. Use `missive drafts create --send` which sets `send: true` on creation.
- Draft create body wraps params in a `drafts` key (Missive API convention).

### API Gotchas (discovered via smoke testing)

- **Conversations list requires a mailbox filter.** The API returns 400 `"You need to paginate at least one mailbox"` if you don't specify one. Our client defaults to `inbox` when no label/team filter is given. Valid mailbox values: `inbox`, `all`, `assigned`, `closed`, `snoozed`, `flagged`, `trashed`, `drafts`.
- **Minimum limit is 2.** Passing `--limit 1` returns 400 `"min 'limit' value is 2"`. Max is 50 for conversations, 10 for messages/drafts.
- **Get conversation returns an array.** `GET /conversations/:id` wraps the result in `{ conversations: [...] }` (array), not a single object, despite being a single-resource fetch.
- **Draft create requires `from_field`.** The API returns 400 `"'from_field' does not match an available sender"` if you omit it or use an email not configured as a sender in Missive. Use `--from <email>` with a valid sender address.
- **Conversation state changes use the posts endpoint.** There is no PATCH endpoint for conversations. Close, reopen, assign, and label operations use `POST /v1/posts` with action parameters (`close`, `add_to_inbox`, `add_assignees`, `add_shared_labels`, etc.). Posts are Missive's recommended approach for automations — they leave a visible trace and don't create ghost draft artifacts. Posts require `notification` (object with `title` and `body`) and `text` fields in addition to action params.
- **Close ≠ Archive.** `close` resolves an assignment (team workflow state). It does NOT remove conversations from the inbox. There is no REST API endpoint or parameter to archive conversations (remove from inbox). Archiving is only available via the Missive UI or JavaScript/iFrame API. Gmail archive should sync to Missive in theory, but may not work reliably.
- **Build before running globally.** After editing source, `npm run build` is required before the `missive` global command reflects changes. Use `npx tsx src/cli.ts` during dev to skip the build step.

## Adding New Commands

1. Create `src/commands/<resource>.ts` exporting `register<Resource>(program, getClient)`
2. Add client methods to `src/client.ts`
3. Add types to `src/types.ts`
4. Import and call the register function in `src/cli.ts`
