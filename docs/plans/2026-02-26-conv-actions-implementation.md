# Conversation Actions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add conversation action commands (close/archive, move to inbox, assign, label) to the missive CLI.

**Architecture:** The Missive API has no dedicated conversation update endpoint. State changes are done via `POST /v1/drafts` with action parameters. We add a `conversations actions` subcommand group that creates "action-only" drafts (no body/subject needed).

**Tech Stack:** TypeScript, Commander.js, Vitest

---

### Task 1: Add Client Method — Test First

**Files:**
- Modify: `src/__tests__/client.test.ts` (append new describe block)

**Step 1: Write failing tests**

Append inside the outer `describe("MissiveClient")` block:

```typescript
  describe("performConversationAction", () => {
    it("calls POST /drafts with close action", async () => {
      const fetch = mockFetch({ drafts: { id: "d-1" } });
      vi.stubGlobal("fetch", fetch);
      await client.performConversationAction("conv-1", { close: true });
      const body = JSON.parse(fetch.mock.calls[0][1].body as string);
      expect(body.drafts.conversation).toBe("conv-1");
      expect(body.drafts.close).toBe(true);
    });

    it("calls POST /drafts with add_to_inbox action", async () => {
      const fetch = mockFetch({ drafts: { id: "d-1" } });
      vi.stubGlobal("fetch", fetch);
      await client.performConversationAction("conv-1", { add_to_inbox: true });
      const body = JSON.parse(fetch.mock.calls[0][1].body as string);
      expect(body.drafts.conversation).toBe("conv-1");
      expect(body.drafts.add_to_inbox).toBe(true);
    });

    it("calls POST /drafts with add_shared_labels", async () => {
      const fetch = mockFetch({ drafts: { id: "d-1" } });
      vi.stubGlobal("fetch", fetch);
      await client.performConversationAction("conv-1", { add_shared_labels: ["label-1"] });
      const body = JSON.parse(fetch.mock.calls[0][1].body as string);
      expect(body.drafts.add_shared_labels).toEqual(["label-1"]);
    });

    it("calls POST /drafts with add_assignees and organization", async () => {
      const fetch = mockFetch({ drafts: { id: "d-1" } });
      vi.stubGlobal("fetch", fetch);
      await client.performConversationAction("conv-1", {
        add_assignees: ["user-1"],
        organization: "org-1",
      });
      const body = JSON.parse(fetch.mock.calls[0][1].body as string);
      expect(body.drafts.add_assignees).toEqual(["user-1"]);
      expect(body.drafts.organization).toBe("org-1");
    });
  });
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/client.test.ts`
Expected: FAIL — method doesn't exist yet

**Step 3: Commit failing tests**

```bash
git add src/__tests__/client.test.ts
git commit -m "test: add failing tests for conversation action client method"
```

---

### Task 2: Implement Client Method

**Files:**
- Modify: `src/types.ts` (append ConversationActionParams)
- Modify: `src/client.ts` (add method + import)

**Step 1: Add type to `src/types.ts`**

Append:

```typescript
export interface ConversationActionParams {
  close?: boolean;
  add_to_inbox?: boolean;
  add_to_team_inbox?: boolean;
  team?: string;
  add_assignees?: string[];
  organization?: string;
  add_shared_labels?: string[];
  remove_shared_labels?: string[];
}
```

**Step 2: Add method to `src/client.ts`**

Add import for `ConversationActionParams` and append method before closing brace:

```typescript
  // --- Conversation Actions ---

  async performConversationAction(
    conversationId: string,
    params: ConversationActionParams,
  ): Promise<{ drafts: Draft }> {
    return this.request("POST", "/drafts", {
      drafts: {
        conversation: conversationId,
        ...params,
      },
    });
  }
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/client.test.ts`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/types.ts src/client.ts
git commit -m "feat: add conversation action client method"
```

---

### Task 3: Add Conversation Action CLI Commands

**Files:**
- Modify: `src/commands/conversations.ts` (append subcommands)

**Step 1: Add action subcommands**

Append inside the `registerConversations` function, after the `drafts` subcommand:

```typescript
  conv
    .command("close <id>")
    .description("Close/archive a conversation")
    .action(async (id: string) => {
      await getClient().performConversationAction(id, { close: true });
      console.log("Conversation closed.");
    });

  conv
    .command("reopen <id>")
    .description("Move a conversation back to inbox")
    .action(async (id: string) => {
      await getClient().performConversationAction(id, { add_to_inbox: true });
      console.log("Conversation moved to inbox.");
    });

  conv
    .command("assign <id>")
    .description("Assign users to a conversation")
    .requiredOption("--users <ids...>", "User IDs to assign")
    .requiredOption("--organization <id>", "Organization ID (required for assignment)")
    .action(async (id: string, opts) => {
      await getClient().performConversationAction(id, {
        add_assignees: opts.users,
        organization: opts.organization,
      });
      console.log("Users assigned.");
    });

  conv
    .command("label <id>")
    .description("Add or remove shared labels on a conversation")
    .option("--add <ids...>", "Shared label IDs to add")
    .option("--remove <ids...>", "Shared label IDs to remove")
    .action(async (id: string, opts) => {
      if (!opts.add && !opts.remove) {
        console.error("Specify --add or --remove with label IDs.");
        process.exit(1);
      }
      await getClient().performConversationAction(id, {
        add_shared_labels: opts.add,
        remove_shared_labels: opts.remove,
      });
      console.log("Labels updated.");
    });
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/commands/conversations.ts
git commit -m "feat: add close, reopen, assign, label conversation commands"
```

---

### Task 4: Add CLI Integration Tests

**Files:**
- Modify: `src/__tests__/cli.test.ts` (append tests)

**Step 1: Add CLI help tests**

Append to the `conversations` describe block in `cli.test.ts`:

```typescript
    it("close shows in help", async () => {
      const out = await run("conv", "--help");
      expect(out).toContain("close");
      expect(out).toContain("reopen");
      expect(out).toContain("assign");
      expect(out).toContain("label");
    });

    it("assign shows required flags", async () => {
      const out = await run("conv", "assign", "--help");
      expect(out).toContain("--users");
      expect(out).toContain("--organization");
    });

    it("label shows add and remove flags", async () => {
      const out = await run("conv", "label", "--help");
      expect(out).toContain("--add");
      expect(out).toContain("--remove");
    });
```

**Step 2: Run all tests**

Run: `npm test`
Expected: All pass

**Step 3: Commit**

```bash
git add src/__tests__/cli.test.ts
git commit -m "test: add CLI integration tests for conversation actions"
```

---

### Task 5: Update CLAUDE.md and Build

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update CLAUDE.md**

Add conversation actions to the API gotchas section:

```markdown
- **Conversation state changes use the drafts endpoint.** There is no PATCH endpoint for conversations. Close, reopen, assign, and label operations create an action-only draft via `POST /v1/drafts` with action parameters (`close`, `add_to_inbox`, `add_assignees`, `add_shared_labels`, etc.).
```

**Step 2: Build and verify**

Run: `npm run build && missive conv --help`
Expected: Shows close, reopen, assign, label subcommands

**Step 3: Run full test suite**

Run: `npm test`
Expected: All pass

**Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add conversation actions to CLAUDE.md"
```
