# Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full test coverage for the missive CLI — MissiveClient (mock fetch), config token resolution, and CLI integration tests for all command groups.

**Architecture:** Vitest with native ESM. Mock `global.fetch` for client tests, mock `node:fs` for config tests, spawn CLI process for integration tests. No real API calls.

**Tech Stack:** Vitest, TypeScript, tsx

---

### Task 1: Test Infrastructure Setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install vitest**

Run: `npm install -D vitest`

**Step 2: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    restoreMocks: true,
  },
});
```

**Step 3: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify vitest runs**

Run: `npx vitest run`
Expected: "No test files found" (no tests yet, but vitest runs)

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test infrastructure"
```

---

### Task 2: MissiveClient Unit Tests — Conversations

**Files:**
- Create: `src/__tests__/client.test.ts`

**Step 1: Write tests for conversation methods**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissiveClient, MissiveApiError } from "../client.js";

// Helper to mock fetch
function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

describe("MissiveClient", () => {
  let client: MissiveClient;

  beforeEach(() => {
    client = new MissiveClient("test-token", "https://api.test.com/v1");
  });

  describe("request basics", () => {
    it("sends Authorization header with bearer token", async () => {
      const fetch = mockFetch({ conversations: [] });
      vi.stubGlobal("fetch", fetch);

      await client.listConversations();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("throws MissiveApiError on non-ok response", async () => {
      vi.stubGlobal("fetch", mockFetch("Unauthorized", 401));

      await expect(client.listConversations()).rejects.toThrow(MissiveApiError);
      await expect(client.listConversations()).rejects.toThrow("401");
    });
  });

  describe("listConversations", () => {
    it("calls GET /conversations with no params", async () => {
      const fetch = mockFetch({ conversations: [] });
      vi.stubGlobal("fetch", fetch);

      const result = await client.listConversations();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/conversations",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual({ conversations: [] });
    });

    it("passes label as shared_label query param", async () => {
      const fetch = mockFetch({ conversations: [] });
      vi.stubGlobal("fetch", fetch);

      await client.listConversations({ label: "label-123" });

      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("shared_label=label-123");
    });

    it("passes team as team_all query param", async () => {
      const fetch = mockFetch({ conversations: [] });
      vi.stubGlobal("fetch", fetch);

      await client.listConversations({ team: "team-456" });

      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("team_all=team-456");
    });

    it("passes limit and until as query params", async () => {
      const fetch = mockFetch({ conversations: [] });
      vi.stubGlobal("fetch", fetch);

      await client.listConversations({ limit: 10, until: 1700000000 });

      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=10");
      expect(url).toContain("until=1700000000");
    });
  });

  describe("getConversation", () => {
    it("calls GET /conversations/:id", async () => {
      const mockConv = { id: "conv-1", subject: "Test" };
      const fetch = mockFetch({ conversations: mockConv });
      vi.stubGlobal("fetch", fetch);

      const result = await client.getConversation("conv-1");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/conversations/conv-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result.conversations).toEqual(mockConv);
    });
  });

  describe("getConversationMessages", () => {
    it("calls GET /conversations/:id/messages", async () => {
      const fetch = mockFetch({ messages: [] });
      vi.stubGlobal("fetch", fetch);

      await client.getConversationMessages("conv-1");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/conversations/conv-1/messages",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("passes limit and until params", async () => {
      const fetch = mockFetch({ messages: [] });
      vi.stubGlobal("fetch", fetch);

      await client.getConversationMessages("conv-1", { limit: 5, until: 1700000000 });

      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("limit=5");
      expect(url).toContain("until=1700000000");
    });
  });

  describe("getConversationDrafts", () => {
    it("calls GET /conversations/:id/drafts", async () => {
      const fetch = mockFetch({ drafts: [] });
      vi.stubGlobal("fetch", fetch);

      await client.getConversationDrafts("conv-1");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/conversations/conv-1/drafts",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/__tests__/client.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/client.test.ts
git commit -m "test: MissiveClient conversation method tests"
```

---

### Task 3: MissiveClient Unit Tests — Drafts & Messages

**Files:**
- Modify: `src/__tests__/client.test.ts`

**Step 1: Add draft and message tests**

Append these describe blocks inside the outer `describe("MissiveClient")`, after the `getConversationDrafts` describe block:

```typescript
  describe("createDraft", () => {
    it("calls POST /drafts with correct body structure", async () => {
      const mockDraft = { id: "draft-1", subject: "Test" };
      const fetch = mockFetch({ drafts: mockDraft });
      vi.stubGlobal("fetch", fetch);

      await client.createDraft({
        to: [{ name: "Bob", address: "bob@test.com" }],
        subject: "Hello",
        body: "<p>Hi</p>",
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/drafts",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            drafts: {
              subject: "Hello",
              body: "<p>Hi</p>",
              to_fields: [{ name: "Bob", address: "bob@test.com" }],
              cc_fields: undefined,
              bcc_fields: undefined,
              from_field: undefined,
              conversation: undefined,
              send: undefined,
            },
          }),
        }),
      );
    });

    it("passes send: true when send option is set", async () => {
      const fetch = mockFetch({ drafts: { id: "draft-1" } });
      vi.stubGlobal("fetch", fetch);

      await client.createDraft({
        to: [{ name: "", address: "bob@test.com" }],
        subject: "Hello",
        body: "Hi",
        send: true,
      });

      const body = JSON.parse(fetch.mock.calls[0][1].body as string);
      expect(body.drafts.send).toBe(true);
    });

    it("includes cc, bcc, and conversation when provided", async () => {
      const fetch = mockFetch({ drafts: { id: "draft-1" } });
      vi.stubGlobal("fetch", fetch);

      await client.createDraft({
        to: [{ name: "", address: "to@test.com" }],
        subject: "Test",
        body: "Body",
        cc: [{ name: "", address: "cc@test.com" }],
        bcc: [{ name: "", address: "bcc@test.com" }],
        conversation: "conv-123",
      });

      const body = JSON.parse(fetch.mock.calls[0][1].body as string);
      expect(body.drafts.cc_fields).toEqual([{ name: "", address: "cc@test.com" }]);
      expect(body.drafts.bcc_fields).toEqual([{ name: "", address: "bcc@test.com" }]);
      expect(body.drafts.conversation).toBe("conv-123");
    });
  });

  describe("deleteDraft", () => {
    it("calls DELETE /drafts/:id", async () => {
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined),
        text: () => Promise.resolve(""),
      });
      vi.stubGlobal("fetch", fetch);

      await client.deleteDraft("draft-1");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/drafts/draft-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("getMessage", () => {
    it("calls GET /messages/:id", async () => {
      const mockMsg = { id: "msg-1", subject: "Test" };
      const fetch = mockFetch({ messages: mockMsg });
      vi.stubGlobal("fetch", fetch);

      const result = await client.getMessage("msg-1");

      expect(fetch).toHaveBeenCalledWith(
        "https://api.test.com/v1/messages/msg-1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result.messages).toEqual(mockMsg);
    });
  });

  describe("searchByEmailMessageId", () => {
    it("calls GET /messages with email_message_id query param", async () => {
      const fetch = mockFetch({ messages: [] });
      vi.stubGlobal("fetch", fetch);

      await client.searchByEmailMessageId("<abc@test.com>");

      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("email_message_id=");
      expect(url).toContain(encodeURIComponent("<abc@test.com>"));
    });
  });
```

**Step 2: Run tests**

Run: `npx vitest run src/__tests__/client.test.ts`
Expected: All tests PASS (both old and new)

**Step 3: Commit**

```bash
git add src/__tests__/client.test.ts
git commit -m "test: MissiveClient draft and message method tests"
```

---

### Task 4: Config Token Resolution Tests

**Files:**
- Create: `src/__tests__/config.test.ts`

**Step 1: Write config tests**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveToken, readConfig, writeConfig } from "../config.js";
import * as fs from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MISSIVE_API_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("readConfig", () => {
    it("returns empty object when config file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(readConfig()).toEqual({});
    });

    it("parses and returns config when file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ token: "saved-token" }),
      );

      expect(readConfig()).toEqual({ token: "saved-token" });
    });

    it("returns empty object when file contains invalid JSON", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("not json{{{");

      expect(readConfig()).toEqual({});
    });
  });

  describe("writeConfig", () => {
    it("creates config directory and writes JSON file", () => {
      writeConfig({ token: "new-token" });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("missive-mcp"),
        { recursive: true },
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("config.json"),
        expect.stringContaining('"token": "new-token"'),
      );
    });
  });

  describe("resolveToken", () => {
    it("returns CLI token when provided (highest priority)", () => {
      process.env.MISSIVE_API_TOKEN = "env-token";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ token: "saved-token" }),
      );

      expect(resolveToken("cli-token")).toBe("cli-token");
    });

    it("returns env var when no CLI token", () => {
      process.env.MISSIVE_API_TOKEN = "env-token";

      expect(resolveToken()).toBe("env-token");
    });

    it("returns saved config token when no CLI token or env var", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ token: "saved-token" }),
      );

      expect(resolveToken()).toBe("saved-token");
    });

    it("exits process when no token found anywhere", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });
      const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => resolveToken()).toThrow("process.exit called");
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("No Missive API token found"),
      );
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/__tests__/config.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/config.test.ts
git commit -m "test: config token resolution and file I/O tests"
```

---

### Task 5: CLI Integration Tests

**Files:**
- Create: `src/__tests__/cli.test.ts`

**Step 1: Write CLI integration tests**

These tests spawn the CLI process via `execFile` (safe, no shell injection) and verify help output and error behavior. No real API calls.

```typescript
import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function run(...args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "npx", ["tsx", "src/cli.ts", ...args],
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout || "", stderr: e.stderr || "", exitCode: e.code };
  }
}

describe("CLI", () => {
  describe("root", () => {
    it("shows help with all command groups", async () => {
      const { stdout } = await run("--help");
      expect(stdout).toContain("conversations|conv");
      expect(stdout).toContain("drafts");
      expect(stdout).toContain("messages|msg");
      expect(stdout).toContain("config");
    });

    it("shows version", async () => {
      const { stdout } = await run("--version");
      expect(stdout.trim()).toBe("0.1.0");
    });
  });

  describe("conversations", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("conversations", "--help");
      expect(stdout).toContain("list");
      expect(stdout).toContain("get");
      expect(stdout).toContain("messages");
      expect(stdout).toContain("drafts");
    });

    it("conv alias works", async () => {
      const { stdout } = await run("conv", "--help");
      expect(stdout).toContain("list");
    });

    it("list shows filter options", async () => {
      const { stdout } = await run("conversations", "list", "--help");
      expect(stdout).toContain("--label");
      expect(stdout).toContain("--team");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--until");
    });
  });

  describe("drafts", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("drafts", "--help");
      expect(stdout).toContain("create");
      expect(stdout).toContain("delete");
    });

    it("create shows required and optional flags", async () => {
      const { stdout } = await run("drafts", "create", "--help");
      expect(stdout).toContain("--to");
      expect(stdout).toContain("--subject");
      expect(stdout).toContain("--body");
      expect(stdout).toContain("--cc");
      expect(stdout).toContain("--bcc");
      expect(stdout).toContain("--send");
      expect(stdout).toContain("--conversation-id");
    });
  });

  describe("messages", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("messages", "--help");
      expect(stdout).toContain("get");
      expect(stdout).toContain("search");
    });

    it("msg alias works", async () => {
      const { stdout } = await run("msg", "--help");
      expect(stdout).toContain("get");
    });

    it("search shows required email-message-id flag", async () => {
      const { stdout } = await run("messages", "search", "--help");
      expect(stdout).toContain("--email-message-id");
    });
  });

  describe("config", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("config", "--help");
      expect(stdout).toContain("set-token");
      expect(stdout).toContain("show");
    });
  });

  describe("error handling", () => {
    it("shows error when command requires token but none configured", async () => {
      const { stderr, exitCode } = await run("conversations", "list");
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("No Missive API token found");
    });
  });
});
```

**Note:** The "error handling" test assumes `MISSIVE_API_TOKEN` is not set in the test environment. If it is set, that test will make a real API call instead of failing. For CI, ensure the env var is unset.

**Step 2: Run tests**

Run: `npx vitest run src/__tests__/cli.test.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/__tests__/cli.test.ts
git commit -m "test: CLI integration tests for help output and error handling"
```

---

### Task 6: Final Verification and Docs

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass across all 3 test files

**Step 2: Update CLAUDE.md with test commands**

Add to the Commands section:
```
npm test                                       # Run all tests
npm run test:watch                             # Run tests in watch mode
npx vitest run src/__tests__/client.test.ts    # Run single test file
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add test commands to CLAUDE.md"
```
