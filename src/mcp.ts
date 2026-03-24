#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MissiveClient, MissiveApiError } from "./client.js";
import { resolveToken } from "./config.js";
import type { ContactInfo } from "./types.js";

// --- Client setup ---

const client = new MissiveClient(resolveToken());

// --- Helpers ---

function ok(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function err(e: unknown): { content: Array<{ type: "text"; text: string }>; isError: true } {
  if (e instanceof MissiveApiError) {
    return { content: [{ type: "text" as const, text: `Missive API error: ${e.message}` }], isError: true };
  }
  return { content: [{ type: "text" as const, text: String(e) }], isError: true };
}

// --- Server ---

const server = new McpServer({
  name: "missive-mcp",
  version: "0.1.0",
});

// --- Conversations ---

server.registerTool("list_conversations", {
  title: "List Conversations",
  description: "List conversations from a mailbox. Defaults to inbox.",
  inputSchema: {
    mailbox: z.enum(["inbox", "all", "assigned", "closed", "snoozed", "flagged", "trashed", "drafts"]).optional().describe("Mailbox filter (defaults to inbox)"),
    label: z.string().optional().describe("Shared label ID to filter by"),
    team: z.string().optional().describe("Team ID to filter by"),
    limit: z.number().min(2).max(50).optional().describe("Number of conversations to return (2-50)"),
    until: z.number().optional().describe("Unix timestamp for pagination (use last_activity_at from last result)"),
  },
}, async ({ mailbox, label, team, limit, until }) => {
  try {
    return ok(await client.listConversations({ mailbox, label, team, limit, until }));
  } catch (e) { return err(e); }
});

server.registerTool("get_conversation", {
  title: "Get Conversation",
  description: "Get a single conversation by ID.",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
  },
}, async ({ id }) => {
  try {
    return ok(await client.getConversation(id));
  } catch (e) { return err(e); }
});

server.registerTool("get_conversation_messages", {
  title: "Get Conversation Messages",
  description: "Get messages in a conversation. Returns up to 10 messages per page.",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
    limit: z.number().min(2).max(10).optional().describe("Number of messages to return (2-10)"),
    until: z.number().optional().describe("Unix timestamp for pagination (use delivered_at from last message)"),
  },
}, async ({ id, limit, until }) => {
  try {
    return ok(await client.getConversationMessages(id, { limit, until }));
  } catch (e) { return err(e); }
});

server.registerTool("get_conversation_drafts", {
  title: "Get Conversation Drafts",
  description: "Get drafts in a conversation.",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
    limit: z.number().min(2).max(10).optional().describe("Number of drafts to return (2-10)"),
    until: z.number().optional().describe("Unix timestamp for pagination"),
  },
}, async ({ id, limit, until }) => {
  try {
    return ok(await client.getConversationDrafts(id, { limit, until }));
  } catch (e) { return err(e); }
});

// --- Conversation Actions ---

server.registerTool("close_conversation", {
  title: "Close Conversation",
  description: "Close/archive a conversation (removes from inbox).",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
  },
}, async ({ id }) => {
  try {
    return ok(await client.performConversationAction(id, { close: true }));
  } catch (e) { return err(e); }
});

server.registerTool("reopen_conversation", {
  title: "Reopen Conversation",
  description: "Reopen a conversation (moves back to inbox).",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
  },
}, async ({ id }) => {
  try {
    return ok(await client.performConversationAction(id, { add_to_inbox: true }));
  } catch (e) { return err(e); }
});

server.registerTool("assign_conversation", {
  title: "Assign Conversation",
  description: "Assign users to a conversation.",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
    users: z.array(z.string()).describe("User IDs to assign"),
    organization: z.string().describe("Organization ID (required by Missive API)"),
  },
}, async ({ id, users, organization }) => {
  try {
    return ok(await client.performConversationAction(id, {
      add_assignees: users,
      organization,
    }));
  } catch (e) { return err(e); }
});

server.registerTool("label_conversation", {
  title: "Label Conversation",
  description: "Add or remove shared labels on a conversation.",
  inputSchema: {
    id: z.string().describe("Conversation ID"),
    organization: z.string().describe("Organization ID (required by Missive API)"),
    add: z.array(z.string()).optional().describe("Shared label IDs to add"),
    remove: z.array(z.string()).optional().describe("Shared label IDs to remove"),
  },
}, async ({ id, organization, add, remove }) => {
  try {
    return ok(await client.performConversationAction(id, {
      organization,
      add_shared_labels: add,
      remove_shared_labels: remove,
    }));
  } catch (e) { return err(e); }
});

// --- Messages ---

server.registerTool("get_message", {
  title: "Get Message",
  description: "Get a single message by ID, including full body and headers.",
  inputSchema: {
    id: z.string().describe("Message ID"),
  },
}, async ({ id }) => {
  try {
    return ok(await client.getMessage(id));
  } catch (e) { return err(e); }
});

server.registerTool("search_messages", {
  title: "Search Messages",
  description: "Search for messages by email Message-ID header.",
  inputSchema: {
    email_message_id: z.string().describe("Email Message-ID header value to search for"),
  },
}, async ({ email_message_id }) => {
  try {
    return ok(await client.searchByEmailMessageId(email_message_id));
  } catch (e) { return err(e); }
});

// --- Drafts ---

server.registerTool("create_draft", {
  title: "Create Draft",
  description: "Create a draft or send an email. Set send=true to send immediately. The from_field must match a sender configured in Missive.",
  inputSchema: {
    from_email: z.string().describe("Sender email address (must match a Missive sender)"),
    to: z.array(z.object({
      name: z.string().optional().describe("Recipient display name"),
      address: z.string().describe("Recipient email address"),
    })).describe("To recipients"),
    subject: z.string().optional().describe("Email subject"),
    body: z.string().describe("Email body (HTML supported)"),
    cc: z.array(z.object({
      name: z.string().optional().describe("CC display name"),
      address: z.string().describe("CC email address"),
    })).optional().describe("CC recipients"),
    bcc: z.array(z.object({
      name: z.string().optional().describe("BCC display name"),
      address: z.string().describe("BCC email address"),
    })).optional().describe("BCC recipients"),
    conversation_id: z.string().optional().describe("Conversation ID to attach draft to (for replies)"),
    send: z.boolean().optional().describe("Set to true to send immediately"),
  },
}, async ({ from_email, to, subject, body, cc, bcc, conversation_id, send }) => {
  try {
    return ok(await client.createDraft({
      from_field: { name: "", address: from_email },
      to: to.map((r) => ({ name: r.name ?? "", address: r.address })),
      subject: subject ?? "",
      body,
      cc: cc?.map((r) => ({ name: r.name ?? "", address: r.address })),
      bcc: bcc?.map((r) => ({ name: r.name ?? "", address: r.address })),
      conversation: conversation_id,
      send,
    }));
  } catch (e) { return err(e); }
});

server.registerTool("delete_draft", {
  title: "Delete Draft",
  description: "Delete a draft by ID.",
  inputSchema: {
    id: z.string().describe("Draft ID"),
  },
}, async ({ id }) => {
  try {
    await client.deleteDraft(id);
    return ok({ success: true });
  } catch (e) { return err(e); }
});

// --- Contacts ---

server.registerTool("list_contacts", {
  title: "List Contacts",
  description: "List contacts in a contact book. Supports search and pagination.",
  inputSchema: {
    contact_book: z.string().describe("Contact book ID"),
    search: z.string().optional().describe("Search query to filter contacts"),
    limit: z.number().max(200).optional().describe("Number of contacts to return (max 200)"),
    offset: z.number().optional().describe("Offset for pagination"),
  },
}, async ({ contact_book, search, limit, offset }) => {
  try {
    return ok(await client.listContacts({ contact_book, search, limit, offset }));
  } catch (e) { return err(e); }
});

server.registerTool("get_contact", {
  title: "Get Contact",
  description: "Get a single contact by ID.",
  inputSchema: {
    id: z.string().describe("Contact ID"),
  },
}, async ({ id }) => {
  try {
    return ok(await client.getContact(id));
  } catch (e) { return err(e); }
});

server.registerTool("create_contact", {
  title: "Create Contact",
  description: "Create a new contact in a contact book.",
  inputSchema: {
    contact_book: z.string().describe("Contact book ID"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    notes: z.string().optional().describe("Notes about the contact"),
    email: z.string().optional().describe("Email address (convenience — added to infos)"),
    phone: z.string().optional().describe("Phone number (convenience — added to infos)"),
  },
}, async ({ contact_book, first_name, last_name, notes, email, phone }) => {
  try {
    const infos: ContactInfo[] = [];
    if (email) infos.push({ kind: "email", value: email, label: "work" });
    if (phone) infos.push({ kind: "phone_number", value: phone, label: "work" });
    return ok(await client.createContact({
      contact_book,
      first_name,
      last_name,
      notes,
      infos: infos.length > 0 ? infos : undefined,
    }));
  } catch (e) { return err(e); }
});

server.registerTool("update_contact", {
  title: "Update Contact",
  description: "Update an existing contact. Note: email/phone replace all existing values (not additive).",
  inputSchema: {
    id: z.string().describe("Contact ID"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    notes: z.string().optional().describe("Notes about the contact"),
    email: z.string().optional().describe("Email address (replaces existing emails)"),
    phone: z.string().optional().describe("Phone number (replaces existing phone numbers)"),
  },
}, async ({ id, first_name, last_name, notes, email, phone }) => {
  try {
    const infos: ContactInfo[] = [];
    if (email) infos.push({ kind: "email", value: email, label: "work" });
    if (phone) infos.push({ kind: "phone_number", value: phone, label: "work" });
    return ok(await client.updateContact(id, {
      first_name,
      last_name,
      notes,
      infos: infos.length > 0 ? infos : undefined,
    }));
  } catch (e) { return err(e); }
});

// --- Contact Books ---

server.registerTool("list_contact_books", {
  title: "List Contact Books",
  description: "List all contact books.",
  inputSchema: {
    limit: z.number().optional().describe("Number of contact books to return"),
    offset: z.number().optional().describe("Offset for pagination"),
  },
}, async ({ limit, offset }) => {
  try {
    return ok(await client.listContactBooks({ limit, offset }));
  } catch (e) { return err(e); }
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
