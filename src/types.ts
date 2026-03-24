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

export interface Organization {
  id: string;
  name: string;
}

export interface ConversationActionParams {
  close?: boolean;
  add_to_inbox?: boolean;
  add_to_team_inbox?: boolean;
  team?: string;
  force_team?: boolean;
  add_assignees?: string[];
  organization?: string;
  add_shared_labels?: string[];
  remove_shared_labels?: string[];
  conversation_subject?: string;
  conversation_color?: string;
}

export interface Post {
  id: string;
  created_at: number;
  username: string;
  username_icon: string | null;
  notification: Record<string, unknown> | null;
  attachments: Attachment[];
  conversation?: Conversation;
}
