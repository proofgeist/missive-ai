# Contacts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full CRUD contacts support and contact book listing to the missive CLI.

**Architecture:** Two new command files (`contacts.ts`, `contact-books.ts`) following existing register pattern. Client methods added to `MissiveClient`. Types added to `types.ts`. Convenience flags `--email`/`--phone` build the `infos` array.

**Tech Stack:** TypeScript, Commander.js, Vitest

---

### Task 1: Add Contact Types

**Files:**
- Modify: `src/types.ts:84` (append after `CreateDraftParams`)

**Step 1: Add types to `src/types.ts`**

Append after the existing `CreateDraftParams` interface:

```typescript
export interface ContactInfo {
  kind: "email" | "phone_number" | "twitter" | "facebook" | "physical_address" | "url" | "custom";
  value?: string;
  label: string;
  custom_label?: string;
}

export interface ContactMembership {
  department?: string;
  title?: string;
  location?: string;
  description?: string;
  group: { kind: "organization" | "group"; name: string };
}

export interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  nickname: string | null;
  prefix: string | null;
  suffix: string | null;
  notes: string | null;
  starred: boolean;
  gender: string | null;
  contact_book: string;
  deleted: boolean;
  modified_at: number;
  infos: ContactInfo[];
  memberships: ContactMembership[];
}

export interface ContactBook {
  id: string;
  name: string;
  description: string | null;
  user: string | null;
  organization: string | null;
  share_with_organization: boolean;
  share_with_team: string | null;
  share_with_users: string[];
}

export interface CreateContactParams {
  contact_book: string;
  first_name?: string;
  last_name?: string;
  notes?: string;
  infos?: ContactInfo[];
}

export interface UpdateContactParams {
  first_name?: string;
  last_name?: string;
  notes?: string;
  infos?: ContactInfo[];
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add contact and contact book types"
```

---

### Task 2: Add Client Methods — Tests First

**Files:**
- Modify: `src/__tests__/client.test.ts` (append new describe blocks)

**Step 1: Write failing tests for all 5 client methods**

Append to `src/__tests__/client.test.ts` inside the outer `describe("MissiveClient")` block, before the closing `});`:

```typescript
  describe("listContacts", () => {
    it("calls GET /contacts with contact_book query param", async () => {
      const fetch = mockFetch({ contacts: [] });
      vi.stubGlobal("fetch", fetch);
      await client.listContacts({ contact_book: "book-1" });
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("/contacts");
      expect(url).toContain("contact_book=book-1");
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("passes search, limit, and offset params", async () => {
      const fetch = mockFetch({ contacts: [] });
      vi.stubGlobal("fetch", fetch);
      await client.listContacts({ contact_book: "book-1", search: "John", limit: 10, offset: 20 });
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("search=John");
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=20");
    });
  });

  describe("getContact", () => {
    it("calls GET /contacts/:id", async () => {
      const mockContact = { id: "c-1", first_name: "John" };
      const fetch = mockFetch({ contacts: mockContact });
      vi.stubGlobal("fetch", fetch);
      const result = await client.getContact("c-1");
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/contacts/c-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result.contacts).toEqual(mockContact);
    });
  });

  describe("createContact", () => {
    it("calls POST /contacts with correct body", async () => {
      const fetch = mockFetch({ contacts: { id: "c-new" } });
      vi.stubGlobal("fetch", fetch);
      await client.createContact({
        contact_book: "book-1",
        first_name: "Jane",
        last_name: "Doe",
        infos: [{ kind: "email", value: "jane@test.com", label: "work" }],
      });
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/contacts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            contacts: [{
              contact_book: "book-1",
              first_name: "Jane",
              last_name: "Doe",
              infos: [{ kind: "email", value: "jane@test.com", label: "work" }],
            }],
          }),
        }),
      );
    });
  });

  describe("updateContact", () => {
    it("calls PATCH /contacts/:id with correct body", async () => {
      const fetch = mockFetch({ contacts: { id: "c-1" } });
      vi.stubGlobal("fetch", fetch);
      await client.updateContact("c-1", { first_name: "Updated" });
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/contacts/c-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            contacts: { first_name: "Updated" },
          }),
        }),
      );
    });
  });

  describe("listContactBooks", () => {
    it("calls GET /contact_books", async () => {
      const fetch = mockFetch({ contact_books: [] });
      vi.stubGlobal("fetch", fetch);
      await client.listContactBooks();
      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/contact_books",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("passes limit and offset params", async () => {
      const fetch = mockFetch({ contact_books: [] });
      vi.stubGlobal("fetch", fetch);
      await client.listContactBooks({ limit: 10, offset: 5 });
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=10");
      expect(url).toContain("offset=5");
    });
  });
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/client.test.ts`
Expected: FAIL — methods don't exist yet

**Step 3: Commit failing tests**

```bash
git add src/__tests__/client.test.ts
git commit -m "test: add failing tests for contact client methods"
```

---

### Task 3: Implement Client Methods

**Files:**
- Modify: `src/client.ts:134` (append before closing brace)

**Step 1: Add 5 methods to `MissiveClient`**

Append before the final `}` in `src/client.ts`:

```typescript
  // --- Contacts ---

  async listContacts(params: {
    contact_book: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ contacts: Contact[] }> {
    const query = new URLSearchParams();
    query.set("contact_book", params.contact_book);
    if (params.search) query.set("search", params.search);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    return this.request("GET", `/contacts?${query.toString()}`);
  }

  async getContact(id: string): Promise<{ contacts: Contact }> {
    return this.request("GET", `/contacts/${id}`);
  }

  async createContact(params: CreateContactParams): Promise<{ contacts: Contact }> {
    return this.request("POST", "/contacts", {
      contacts: [{
        contact_book: params.contact_book,
        first_name: params.first_name,
        last_name: params.last_name,
        notes: params.notes,
        infos: params.infos,
      }],
    });
  }

  async updateContact(id: string, params: UpdateContactParams): Promise<{ contacts: Contact }> {
    return this.request("PATCH", `/contacts/${id}`, {
      contacts: {
        first_name: params.first_name,
        last_name: params.last_name,
        notes: params.notes,
        infos: params.infos,
      },
    });
  }

  // --- Contact Books ---

  async listContactBooks(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{ contact_books: ContactBook[] }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();
    return this.request("GET", `/contact_books${qs ? `?${qs}` : ""}`);
  }
```

Also add imports at top of `src/client.ts`:

```typescript
import type {
  Conversation,
  Message,
  Draft,
  CreateDraftParams,
  Contact,
  ContactBook,
  CreateContactParams,
  UpdateContactParams,
} from "./types.js";
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/client.test.ts`
Expected: All PASS (including new contact tests)

**Step 3: Commit**

```bash
git add src/client.ts
git commit -m "feat: add contact and contact book client methods"
```

---

### Task 4: Add Contacts Command

**Files:**
- Create: `src/commands/contacts.ts`

**Step 1: Create `src/commands/contacts.ts`**

```typescript
import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerContacts(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const contacts = program
    .command("contacts")
    .alias("contact")
    .description("Manage contacts");

  contacts
    .command("list")
    .description("List contacts in a contact book")
    .requiredOption("--contact-book <id>", "Contact book ID")
    .option("--search <term>", "Search contacts")
    .option("--limit <n>", "Max results (default 50, max 200)", parseInt)
    .option("--offset <n>", "Pagination offset (default 0)", parseInt)
    .action(async (opts) => {
      const result = await getClient().listContacts({
        contact_book: opts.contactBook,
        search: opts.search,
        limit: opts.limit,
        offset: opts.offset,
      });
      output(result);
    });

  contacts
    .command("get <id>")
    .description("Get a specific contact")
    .action(async (id: string) => {
      const result = await getClient().getContact(id);
      output(result);
    });

  contacts
    .command("create")
    .description("Create a new contact")
    .requiredOption("--contact-book <id>", "Contact book ID")
    .requiredOption("--first-name <name>", "First name")
    .option("--last-name <name>", "Last name")
    .option("--email <address>", "Email address (added as work email)")
    .option("--phone <number>", "Phone number (added as work phone)")
    .option("--notes <text>", "Notes")
    .action(async (opts) => {
      const infos: Array<{ kind: string; value: string; label: string }> = [];
      if (opts.email) infos.push({ kind: "email", value: opts.email, label: "work" });
      if (opts.phone) infos.push({ kind: "phone_number", value: opts.phone, label: "work" });

      const result = await getClient().createContact({
        contact_book: opts.contactBook,
        first_name: opts.firstName,
        last_name: opts.lastName,
        notes: opts.notes,
        infos: infos.length > 0 ? infos : undefined,
      });
      output(result);
    });

  contacts
    .command("update <id>")
    .description("Update a contact")
    .option("--first-name <name>", "First name")
    .option("--last-name <name>", "Last name")
    .option("--email <address>", "Email address (replaces all emails with this work email)")
    .option("--phone <number>", "Phone number (replaces all phones with this work phone)")
    .option("--notes <text>", "Notes")
    .action(async (id: string, opts) => {
      const infos: Array<{ kind: string; value: string; label: string }> | undefined =
        (opts.email || opts.phone) ? [] : undefined;
      if (opts.email) infos!.push({ kind: "email", value: opts.email, label: "work" });
      if (opts.phone) infos!.push({ kind: "phone_number", value: opts.phone, label: "work" });

      const result = await getClient().updateContact(id, {
        first_name: opts.firstName,
        last_name: opts.lastName,
        notes: opts.notes,
        infos: infos,
      });
      output(result);
    });
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/commands/contacts.ts
git commit -m "feat: add contacts command with list, get, create, update"
```

---

### Task 5: Add Contact Books Command

**Files:**
- Create: `src/commands/contact-books.ts`

**Step 1: Create `src/commands/contact-books.ts`**

```typescript
import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerContactBooks(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const books = program
    .command("contact-books")
    .description("Manage contact books");

  books
    .command("list")
    .description("List available contact books")
    .option("--limit <n>", "Max results (default 50, max 200)", parseInt)
    .option("--offset <n>", "Pagination offset (default 0)", parseInt)
    .action(async (opts) => {
      const result = await getClient().listContactBooks({
        limit: opts.limit,
        offset: opts.offset,
      });
      output(result);
    });
}
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/commands/contact-books.ts
git commit -m "feat: add contact-books command"
```

---

### Task 6: Register Commands in CLI Entry Point

**Files:**
- Modify: `src/cli.ts:7-9` (add imports)
- Modify: `src/cli.ts:55-57` (add register calls)

**Step 1: Add imports**

After line 9 (`import { registerMessages }...`), add:

```typescript
import { registerContacts } from "./commands/contacts.js";
import { registerContactBooks } from "./commands/contact-books.js";
```

**Step 2: Add register calls**

After line 57 (`registerMessages(program, getClient);`), add:

```typescript
registerContacts(program, getClient);
registerContactBooks(program, getClient);
```

**Step 3: Type-check and run all tests**

Run: `npx tsc --noEmit && npm test`
Expected: All pass

**Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: register contacts and contact-books commands"
```

---

### Task 7: Add CLI Integration Tests

**Files:**
- Modify: `src/__tests__/cli.test.ts` (append new describe blocks)

**Step 1: Add CLI help output tests**

Append test blocks following the existing pattern in `cli.test.ts` (which uses `execFile` to run `npx tsx src/cli.ts`). Add describe blocks for `contacts` and `contact-books`:

```typescript
  describe("contacts", () => {
    it("shows subcommands in help", async () => {
      const out = await run("contacts", "--help");
      expect(out).toContain("list");
      expect(out).toContain("get");
      expect(out).toContain("create");
      expect(out).toContain("update");
    });

    it("contact alias works", async () => {
      const out = await run("contact", "--help");
      expect(out).toContain("list");
    });

    it("list shows required contact-book option", async () => {
      const out = await run("contacts", "list", "--help");
      expect(out).toContain("--contact-book");
    });

    it("create shows required and optional flags", async () => {
      const out = await run("contacts", "create", "--help");
      expect(out).toContain("--contact-book");
      expect(out).toContain("--first-name");
      expect(out).toContain("--email");
      expect(out).toContain("--phone");
    });
  });

  describe("contact-books", () => {
    it("shows subcommands in help", async () => {
      const out = await run("contact-books", "--help");
      expect(out).toContain("list");
    });
  });
```

**Step 2: Run all tests**

Run: `npm test`
Expected: All pass

**Step 3: Commit**

```bash
git add src/__tests__/cli.test.ts
git commit -m "test: add CLI integration tests for contacts and contact-books"
```

---

### Task 8: Update CLAUDE.md and Build

**Files:**
- Modify: `CLAUDE.md` (update architecture section)

**Step 1: Update architecture in CLAUDE.md**

Add `contacts.ts` and `contact-books.ts` to the architecture tree and add the commands to the description.

**Step 2: Build and verify global command**

Run: `npm run build && missive contacts --help && missive contact-books --help`
Expected: Both show correct help output

**Step 3: Run full test suite one final time**

Run: `npm test`
Expected: All pass

**Step 4: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: add contacts and contact-books to architecture"
git push origin main
```
