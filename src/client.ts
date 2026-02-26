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
    mailbox?: "inbox" | "all" | "assigned" | "closed" | "snoozed" | "flagged" | "trashed" | "drafts";
    label?: string;
    team?: string;
    limit?: number;
    until?: number;
  }): Promise<{ conversations: Conversation[] }> {
    const query = new URLSearchParams();
    // Missive requires at least one mailbox filter — default to inbox
    const mailbox = params?.mailbox ?? (params?.label || params?.team ? undefined : "inbox");
    if (mailbox) query.set(mailbox, "true");
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
