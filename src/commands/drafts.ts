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
    .option("--from <email>", "Sender email address (must match a Missive sender)")
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
        from_field: opts.from ? { name: "", address: opts.from } : undefined,
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
