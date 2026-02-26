# Missive CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool (`missive`) for interacting with the Missive email/messaging API, optimized for use by Claude Code via Bash.

**Architecture:** CLI-first with commander. Single `MissiveClient` class wraps all REST calls using native fetch. Three command groups (conversations, drafts, messages) plus config. JSON output by default.

**Tech Stack:** TypeScript, commander, native fetch (Node 18+), tsx (dev)

**API note:** Missive uses `until` (Unix timestamp) for pagination, not `offset`. Draft sending is done via `send: true` on creation — there is no "send existing draft" endpoint. The draft create endpoint wraps params in a `drafts` key.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/cli.ts`

**Step 1: Create package.json**

```json
{
  "name": "missive-mcp",
  "version": "0.1.0",
  "description": "CLI for the Missive email/messaging API",
  "type": "module",
  "bin": {
    "missive": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "start": "node dist/cli.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "commander": "^13.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.0.0",
    "@types/node": "^22.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create minimal src/cli.ts**

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("missive")
  .description("CLI for the Missive email/messaging API")
  .version("0.1.0");

program.parse();
```

**Step 4: Install dependencies and verify**

Run: `npm install`
Run: `npx tsx src/cli.ts --help`
Expected: Help output showing "missive" with description and version

**Step 5: Add .gitignore and commit**

Create `.gitignore`:
```
node_modules/
dist/
.atlas/
```

```bash
git add package.json tsconfig.json src/cli.ts .gitignore package-lock.json
git commit -m "feat: project scaffolding with commander CLI"
```

---

### Task 2: Config Module

**Files:**
- Create: `src/config.ts`

**Step 1: Write config module**

Handles token resolution (CLI flag > env var > config file) and config file read/write at `~/.config/missive-mcp/config.json`.

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "missive-mcp");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
}

export function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function resolveToken(cliToken?: string): string {
  const token = cliToken || process.env.MISSIVE_API_TOKEN || readConfig().token;
  if (!token) {
    console.error(
      "No Missive API token found. Set MISSIVE_API_TOKEN env var, use --token flag, or run: missive config set-token <token>"
    );
    process.exit(1);
  }
  return token;
}
```

**Step 2: Wire config commands into CLI**

Add to `src/cli.ts`:

```typescript
import { resolveToken, readConfig, writeConfig } from "./config.js";

// Global --token option
program.option("--token <token>", "Missive API token");

const config = program.command("config").description("Manage configuration");

config
  .command("set-token <token>")
  .description("Store Missive API token")
  .action((token: string) => {
    writeConfig({ ...readConfig(), token });
    console.log("Token saved.");
  });

config
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const cfg = readConfig();
    const token = cfg.token;
    console.log(JSON.stringify({
      token: token ? token.slice(0, 16) + "..." : null,
      config_path: join(homedir(), ".config", "missive-mcp", "config.json"),
    }, null, 2));
  });
```

**Step 3: Verify**

Run: `npx tsx src/cli.ts config --help`
Expected: Shows `set-token` and `show` subcommands

Run: `npx tsx src/cli.ts config set-token test-token-123`
Expected: "Token saved."

Run: `npx tsx src/cli.ts config show`
Expected: JSON with masked token

**Step 4: Commit**

```bash
git add src/config.ts src/cli.ts
git commit -m "feat: config module with token resolution"
```

---

### Task 3: MissiveClient Core

**Files:**
- Create: `src/types.ts`
- Create: `src/client.ts`

**Step 1: Write types**

Define the Missive API response types based on the API reference. Keep them pragmatic — type the fields we actually use in CLI output.

```typescript
// src/types.ts

export interface EmailField {
  name: string;
  address: string;
}

export interface Attachment {
  id: string;
  filename: string;
  extension: string;
  url: string;
  media_type: string;
  size: number;
}

export interface SharedLabel {
  id: string;
  name: string;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface Team {
  id: string;
  name: string;
  organization: string;
}

export interface Conversation {
  id: string;
  created_at: number;
  subject: string | null;
  latest_message_subject: string;
  organization: { id: string; name: string };
  assignees: Array<{ id: string; name: string; email: string }>;
  messages_count: number;
  drafts_count: number;
  authors: EmailField[];
  shared_labels: SharedLabel[];
  team: Team | null;
  web_url: string;
  app_url: string;
  last_activity_at: number;
}

export interface Message {
  id: string;
  subject: string;
  preview: string;
  type: string;
  draft: boolean;
  delivered_at: number | null;
  updated_at: number;
  created_at: number;
  email_message_id: string;
  body?: string;
  from_field: EmailField;
  to_fields: EmailField[];
  cc_fields: EmailField[];
  bcc_fields: EmailField[];
  reply_to_fields: EmailField[];
  attachments: Attachment[];
  conversation?: Conversation;
}

export interface Draft extends Message {
  draft: true;
  author: Author;
}

export interface MissiveApiError {
  status: number;
  message: string;
}

export interface CreateDraftParams {
  to: EmailField[];
  subject: string;
  body: string;
  cc?: EmailField[];
  bcc?: EmailField[];
  conversation?: string;
  send?: boolean;
  from_field?: EmailField;
}
```

**Step 2: Write MissiveClient**

```typescript
// src/client.ts

import type {
  Conversation,
  Message,
  Draft,
  CreateDraftParams,
} from "./types.js";

export class MissiveApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "MissiveApiError";
  }
}

export class MissiveClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl = "https://public.missiveapp.com/v1") {
    this.token = token;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      throw new MissiveApiError(res.status, `${res.status}: ${text}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  // --- Conversations ---

  async listConversations(params?: {
    mailbox?: string;
    label?: string;
    team?: string;
    limit?: number;
    until?: number;
  }): Promise<{ conversations: Conversation[] }> {
    const query = new URLSearchParams();
    if (params?.mailbox) query.set("inbox", "true"); // mailbox filter
    if (params?.label) query.set("shared_label", params.label);
    if (params?.team) query.set("team_all", params.team);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.until) query.set("until", String(params.until));
    const qs = query.toString();
    return this.request("GET", `/conversations${qs ? `?${qs}` : ""}`);
  }

  async getConversation(id: string): Promise<{ conversations: Conversation }> {
    return this.request("GET", `/conversations/${id}`);
  }

  async getConversationMessages(
    id: string,
    params?: { limit?: number; until?: number },
  ): Promise<{ messages: Message[] }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.until) query.set("until", String(params.until));
    const qs = query.toString();
    return this.request("GET", `/conversations/${id}/messages${qs ? `?${qs}` : ""}`);
  }

  async getConversationDrafts(
    id: string,
    params?: { limit?: number; until?: number },
  ): Promise<{ drafts: Draft[] }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.until) query.set("until", String(params.until));
    const qs = query.toString();
    return this.request("GET", `/conversations/${id}/drafts${qs ? `?${qs}` : ""}`);
  }

  // --- Drafts ---

  async createDraft(
    params: CreateDraftParams,
  ): Promise<{ drafts: Draft }> {
    return this.request("POST", "/drafts", {
      drafts: {
        subject: params.subject,
        body: params.body,
        to_fields: params.to,
        cc_fields: params.cc,
        bcc_fields: params.bcc,
        from_field: params.from_field,
        conversation: params.conversation,
        send: params.send,
      },
    });
  }

  async deleteDraft(id: string): Promise<void> {
    return this.request("DELETE", `/drafts/${id}`);
  }

  // --- Messages ---

  async getMessage(id: string): Promise<{ messages: Message }> {
    return this.request("GET", `/messages/${id}`);
  }

  async searchByEmailMessageId(
    emailMessageId: string,
  ): Promise<{ messages: Message[] }> {
    const query = new URLSearchParams({ email_message_id: emailMessageId });
    return this.request("GET", `/messages?${query.toString()}`);
  }
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/types.ts src/client.ts
git commit -m "feat: MissiveClient REST wrapper and API types"
```

---

### Task 4: Output Formatting

**Files:**
- Create: `src/output.ts`

**Step 1: Write output module**

Simple JSON output to stdout. Errors to stderr. This is where we'd add table formatting later.

```typescript
// src/output.ts

export function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function error(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}
```

**Step 2: Commit**

```bash
git add src/output.ts
git commit -m "feat: output formatting module"
```

---

### Task 5: Conversations Command

**Files:**
- Create: `src/commands/conversations.ts`
- Modify: `src/cli.ts`

**Step 1: Write conversations command**

```typescript
// src/commands/conversations.ts

import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerConversations(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const conv = program
    .command("conversations")
    .alias("conv")
    .description("Manage conversations");

  conv
    .command("list")
    .description("List conversations")
    .option("--label <id>", "Filter by shared label ID")
    .option("--team <id>", "Filter by team ID")
    .option("--limit <n>", "Max results (default 25, max 50)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp", parseInt)
    .action(async (opts) => {
      const result = await getClient().listConversations({
        label: opts.label,
        team: opts.team,
        limit: opts.limit,
        until: opts.until,
      });
      output(result);
    });

  conv
    .command("get <id>")
    .description("Get a specific conversation")
    .action(async (id: string) => {
      const result = await getClient().getConversation(id);
      output(result);
    });

  conv
    .command("messages <id>")
    .description("List messages in a conversation")
    .option("--limit <n>", "Max results (default 10, max 10)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp of oldest message delivered_at", parseInt)
    .action(async (id: string, opts) => {
      const result = await getClient().getConversationMessages(id, {
        limit: opts.limit,
        until: opts.until,
      });
      output(result);
    });

  conv
    .command("drafts <id>")
    .description("List drafts in a conversation")
    .option("--limit <n>", "Max results (default 10, max 10)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp", parseInt)
    .action(async (id: string, opts) => {
      const result = await getClient().getConversationDrafts(id, {
        limit: opts.limit,
        until: opts.until,
      });
      output(result);
    });
}
```

**Step 2: Register in cli.ts**

Update `src/cli.ts` to import and register the command, and add the error-handling wrapper:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveToken, readConfig, writeConfig } from "./config.js";
import { MissiveClient, MissiveApiError } from "./client.js";
import { registerConversations } from "./commands/conversations.js";

const program = new Command();

program
  .name("missive")
  .description("CLI for the Missive email/messaging API")
  .version("0.1.0")
  .option("--token <token>", "Missive API token");

// Config commands
const config = program.command("config").description("Manage configuration");

config
  .command("set-token <token>")
  .description("Store Missive API token")
  .action((token: string) => {
    writeConfig({ ...readConfig(), token });
    console.log("Token saved.");
  });

config
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const cfg = readConfig();
    const token = cfg.token;
    console.log(
      JSON.stringify(
        {
          token: token ? token.slice(0, 16) + "..." : null,
          config_path: join(homedir(), ".config", "missive-mcp", "config.json"),
        },
        null,
        2,
      ),
    );
  });

// Lazy client initialization — only resolves token when a command actually needs it
const getClient = (): MissiveClient => {
  const token = resolveToken(program.opts().token);
  return new MissiveClient(token);
};

// Register command groups
registerConversations(program, getClient);

// Error handling
async function main() {
  try {
    await program.parseAsync();
  } catch (err) {
    if (err instanceof MissiveApiError) {
      console.error(`Missive API error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
```

**Step 3: Verify**

Run: `npx tsx src/cli.ts conversations --help`
Expected: Shows `list`, `get`, `messages`, `drafts` subcommands

Run: `npx tsx src/cli.ts conv --help`
Expected: Same (alias works)

**Step 4: Commit**

```bash
git add src/commands/conversations.ts src/cli.ts
git commit -m "feat: conversations command group (list, get, messages, drafts)"
```

---

### Task 6: Drafts Command

**Files:**
- Create: `src/commands/drafts.ts`
- Modify: `src/cli.ts`

**Step 1: Write drafts command**

```typescript
// src/commands/drafts.ts

import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerDrafts(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const drafts = program
    .command("drafts")
    .description("Manage drafts");

  drafts
    .command("create")
    .description("Create a draft (and optionally send it)")
    .requiredOption("--to <emails...>", "Recipient email addresses")
    .requiredOption("--subject <subject>", "Email subject")
    .requiredOption("--body <body>", "Email body (text or HTML)")
    .option("--cc <emails...>", "CC email addresses")
    .option("--bcc <emails...>", "BCC email addresses")
    .option("--conversation-id <id>", "Reply in existing conversation")
    .option("--send", "Send immediately instead of saving as draft")
    .action(async (opts) => {
      const toAddr = (emails: string[]) =>
        emails.map((e) => ({ name: "", address: e }));

      const result = await getClient().createDraft({
        to: toAddr(opts.to),
        subject: opts.subject,
        body: opts.body,
        cc: opts.cc ? toAddr(opts.cc) : undefined,
        bcc: opts.bcc ? toAddr(opts.bcc) : undefined,
        conversation: opts.conversationId,
        send: opts.send || false,
      });
      output(result);
    });

  drafts
    .command("delete <id>")
    .description("Delete a draft")
    .action(async (id: string) => {
      await getClient().deleteDraft(id);
      console.log("Draft deleted.");
    });
}
```

**Step 2: Register in cli.ts**

Add import and registration:

```typescript
import { registerDrafts } from "./commands/drafts.js";
// ... after registerConversations:
registerDrafts(program, getClient);
```

**Step 3: Verify**

Run: `npx tsx src/cli.ts drafts --help`
Expected: Shows `create` and `delete` subcommands

Run: `npx tsx src/cli.ts drafts create --help`
Expected: Shows required --to, --subject, --body and optional flags

**Step 4: Commit**

```bash
git add src/commands/drafts.ts src/cli.ts
git commit -m "feat: drafts command group (create, delete, send via --send flag)"
```

---

### Task 7: Messages Command

**Files:**
- Create: `src/commands/messages.ts`
- Modify: `src/cli.ts`

**Step 1: Write messages command**

```typescript
// src/commands/messages.ts

import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerMessages(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const messages = program
    .command("messages")
    .alias("msg")
    .description("Manage messages");

  messages
    .command("get <id>")
    .description("Get a specific message with full body and headers")
    .action(async (id: string) => {
      const result = await getClient().getMessage(id);
      output(result);
    });

  messages
    .command("search")
    .description("Find messages by email Message-ID header")
    .requiredOption("--email-message-id <id>", "Email Message-ID header value")
    .action(async (opts) => {
      const result = await getClient().searchByEmailMessageId(
        opts.emailMessageId,
      );
      output(result);
    });
}
```

**Step 2: Register in cli.ts**

Add import and registration:

```typescript
import { registerMessages } from "./commands/messages.js";
// ... after registerDrafts:
registerMessages(program, getClient);
```

**Step 3: Verify**

Run: `npx tsx src/cli.ts messages --help`
Expected: Shows `get` and `search` subcommands

Run: `npx tsx src/cli.ts msg --help`
Expected: Same (alias works)

**Step 4: Commit**

```bash
git add src/commands/messages.ts src/cli.ts
git commit -m "feat: messages command group (get, search by email-message-id)"
```

---

### Task 8: Build, Link, and Smoke Test

**Files:**
- Modify: `package.json` (if needed)

**Step 1: Build**

Run: `npm run build`
Expected: Compiles to `dist/` without errors

**Step 2: Link locally**

Run: `npm link`
Expected: `missive` command available globally

**Step 3: Smoke test (requires valid token)**

Run: `missive --help`
Expected: Full help output with all command groups

Run: `missive config set-token <your-token>`
Run: `missive conversations list --limit 2`
Expected: JSON output with conversations array (or API error if token invalid)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: build and link adjustments"
```

---

### Task 9: CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write CLAUDE.md**

Create CLAUDE.md with build commands, architecture overview, and API reference relevant to development. Content will be based on the actual project state after implementation.

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for Claude Code"
```
