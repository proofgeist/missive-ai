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
