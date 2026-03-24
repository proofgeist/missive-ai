# missive-ai

CLI and MCP server for the [Missive](https://missiveapp.com) team email/messaging REST API. Two interfaces into the same client:
- **CLI** (`missive`): JSON output via Bash
- **MCP server** (`missive-mcp`): 17 tools over stdio for Claude Code and other MCP clients

## Install

```bash
npm install -g github:proofgeist/missive-ai
```

## Auth

Get a personal access token from Missive (Settings > API tokens). Then:

```bash
missive config set-token missive_pat-xxx
```

Or set `MISSIVE_API_TOKEN` (or `MISSIVE_API_KEY`) env var, or pass `--token` on each command.

## Usage

### Conversations

```bash
missive conv list                              # Inbox (latest 25)
missive conv list --mailbox flagged --limit 5  # Flagged
missive conv list --mailbox assigned           # Assigned to me
missive conv get <id>                          # Conversation details
missive conv messages <id>                     # Messages in conversation
missive conv drafts <id>                       # Drafts in conversation
```

### Conversation Actions

```bash
missive conv close <id>                                                # Archive/close
missive conv reopen <id>                                               # Move back to inbox
missive conv assign <id> --users <user-id> --organization <org-id>     # Assign users
missive conv label <id> --add <label-id>                               # Add label
missive conv label <id> --remove <label-id>                            # Remove label
```

### Messages

```bash
missive msg get <id>                           # Full message with body
missive msg search --email-message-id <mid>    # Find by Message-ID header
```

### Drafts & Sending

```bash
# Send (--from required, must match a configured Missive sender)
missive drafts create --from you@example.com --to recipient@example.com --subject "Hi" --body "Hello" --send

# Reply to existing conversation
missive drafts create --from you@example.com --conversation-id <id> --to recipient@example.com --body "Reply" --send

# Save as draft (omit --send)
missive drafts create --from you@example.com --to recipient@example.com --subject "WIP" --body "Draft text"

missive drafts delete <id>
```

### Contacts

```bash
missive contact-books list                                    # List contact books
missive contacts list --contact-book <book-id>                # List contacts
missive contacts list --contact-book <book-id> --search "Jo"  # Search
missive contacts get <id>                                     # Contact details
missive contacts create --contact-book <book-id> --first-name "Jane" --last-name "Doe" --email jane@example.com
missive contacts update <id> --first-name "Janet"
```

## MCP Server

The MCP server exposes 17 tools covering conversations, messages, drafts, contacts, and contact books. Auth via `MISSIVE_API_TOKEN` env var (also accepts `MISSIVE_API_KEY`), or the stored config token.

### Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "missive": {
      "command": "missive-mcp",
      "env": {
        "MISSIVE_API_TOKEN": "missive_pat-xxx"
      }
    }
  }
}
```

### Tools

| Tool | Description |
|------|-------------|
| `list_conversations` | List conversations from a mailbox |
| `get_conversation` | Get conversation by ID |
| `get_conversation_messages` | Get messages in a conversation |
| `get_conversation_drafts` | Get drafts in a conversation |
| `close_conversation` | Close/archive a conversation |
| `reopen_conversation` | Reopen a conversation |
| `assign_conversation` | Assign users to a conversation |
| `label_conversation` | Add/remove shared labels |
| `get_message` | Get message with full body |
| `search_messages` | Search by Message-ID header |
| `create_draft` | Create draft or send email |
| `delete_draft` | Delete a draft |
| `list_contacts` | List contacts in a book |
| `get_contact` | Get contact by ID |
| `create_contact` | Create a contact |
| `update_contact` | Update a contact |
| `list_contact_books` | List contact books |

## Development

```bash
npx tsx src/cli.ts <command>     # Run CLI without building
npx tsx src/mcp.ts               # Run MCP server without building
npm test                         # Run tests (vitest)
npx tsc --noEmit                 # Type-check
npm run build                    # Compile to dist/
```

## License

MIT
