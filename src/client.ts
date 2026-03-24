import type {
  Conversation,
  Message,
  Draft,
  Post,
  CreateDraftParams,
  ConversationActionParams,
  Contact,
  ContactBook,
  CreateContactParams,
  UpdateContactParams,
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

  // --- Conversation Actions (via Posts) ---
  // Posts are the recommended approach for automations — they leave a visible
  // trace and don't create ghost draft artifacts like the drafts endpoint does.

  async performConversationAction(
    conversationId: string,
    params: ConversationActionParams,
  ): Promise<{ posts: Post }> {
    const action = params.close
      ? "closed"
      : params.add_to_inbox
        ? "reopened"
        : params.add_assignees
          ? "assigned"
          : params.add_shared_labels || params.remove_shared_labels
            ? "labels updated"
            : "updated";

    return this.request("POST", "/posts", {
      posts: {
        conversation: conversationId,
        notification: { title: `Conversation ${action}`, body: `Via Missive CLI` },
        text: `Conversation ${action} via CLI`,
        ...params,
      },
    });
  }

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
}
