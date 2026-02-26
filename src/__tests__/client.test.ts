import { describe, it, expect, vi, beforeEach } from "vitest";
import { MissiveClient, MissiveApiError } from "../client.js";

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
    it("defaults to inbox mailbox when no filter specified", async () => {
      const fetch = mockFetch({ conversations: [] });
      vi.stubGlobal("fetch", fetch);
      const result = await client.listConversations();
      const url = fetch.mock.calls[0][0] as string;
      expect(url).toContain("inbox=true");
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/conversations"),
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

  describe("createDraft", () => {
    it("calls POST /drafts with correct body structure", async () => {
      const fetch = mockFetch({ drafts: { id: "draft-1" } });
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
});
