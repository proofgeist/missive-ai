# missivecli

CLI for the [Missive](https://missiveapp.com) team email/messaging REST API. JSON output, designed for use with Claude Code via Bash.

## Install

```bash
git clone https://github.com/proofgeist/missivecli.git
cd missivecli
npm install
npm run build
npm link
```

## Auth

Get a personal access token from Missive (Settings > API tokens). Then:

```bash
missive config set-token missive_pat-xxx
```

Or set `MISSIVE_API_TOKEN` env var, or pass `--token` on each command.

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

## Development

```bash
npx tsx src/cli.ts <command>     # Run without building
npm test                         # Run tests (vitest)
npx tsc --noEmit                 # Type-check
npm run build                    # Compile to dist/
```

## License

MIT
