# Contacts Support Design

## Scope

Full CRUD for contacts plus contact book listing. Follows existing CLI patterns.

## Commands

```
missive contacts list --contact-book <id> [--search <term>] [--limit N] [--offset N]
missive contacts get <id>
missive contacts create --contact-book <id> --first-name <name> [--last-name] [--email <addr>] [--phone <num>] [--notes <text>]
missive contacts update <id> [--first-name] [--last-name] [--email <addr>] [--phone <num>] [--notes <text>]
missive contact-books list [--limit N] [--offset N]
```

## Architecture

Two register functions added to `cli.ts`:
- `registerContacts(program, getClient)` in `src/commands/contacts.ts` — aliased as `contact`
- `registerContactBooks(program, getClient)` in `src/commands/contact-books.ts`

Client methods in `src/client.ts`:
- `listContacts(params)`, `getContact(id)`, `createContact(params)`, `updateContact(id, params)`
- `listContactBooks(params)`

Types in `src/types.ts`:
- `Contact`, `ContactInfo`, `ContactMembership`, `ContactBook`, `CreateContactParams`, `UpdateContactParams`

## API Details

- Contacts list requires `contact_book` ID. Supports `search`, `limit` (max 200), `offset`, `modified_since`, `include_deleted`.
- Contacts use offset-based pagination (not `until` timestamps).
- Create requires `contact_book` ID.
- Update uses `PATCH /v1/contacts/:id`. The `infos` and `memberships` arrays are replace-all — omitted items get deleted.
- Contact books list supports `limit` (max 200) and `offset`.

## Design Decisions

- `--email` and `--phone` as convenience flags that build the `infos` array. Covers the common case without requiring raw JSON.
- `contact-books` as a separate top-level command (not nested under contacts) since it's a different resource.
- Alias `contact` for `contacts` for convenience.

## Out of Scope

- Conversation actions (close, assign, label) — separate effort.
- Full `infos` JSON input — future addition if needed.
- Contact groups endpoints — can add later.
