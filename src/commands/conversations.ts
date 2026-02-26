import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerConversations(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const conv = program
    .command("conversations")
    .alias("conv")
    .description("Manage conversations");

  conv
    .command("list")
    .description("List conversations (defaults to inbox)")
    .option("--mailbox <type>", "Mailbox filter: inbox, all, assigned, closed, snoozed, flagged, trashed, drafts (default: inbox)")
    .option("--label <id>", "Filter by shared label ID")
    .option("--team <id>", "Filter by team ID")
    .option("--limit <n>", "Max results (default 25, max 50)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp", parseInt)
    .action(async (opts) => {
      const result = await getClient().listConversations({
        mailbox: opts.mailbox,
        label: opts.label,
        team: opts.team,
        limit: opts.limit,
        until: opts.until,
      });
      output(result);
    });

  conv
    .command("get <id>")
    .description("Get a specific conversation")
    .action(async (id: string) => {
      const result = await getClient().getConversation(id);
      output(result);
    });

  conv
    .command("messages <id>")
    .description("List messages in a conversation")
    .option("--limit <n>", "Max results (default 10, max 10)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp of oldest message delivered_at", parseInt)
    .action(async (id: string, opts) => {
      const result = await getClient().getConversationMessages(id, {
        limit: opts.limit,
        until: opts.until,
      });
      output(result);
    });

  conv
    .command("drafts <id>")
    .description("List drafts in a conversation")
    .option("--limit <n>", "Max results (default 10, max 10)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp", parseInt)
    .action(async (id: string, opts) => {
      const result = await getClient().getConversationDrafts(id, {
        limit: opts.limit,
        until: opts.until,
      });
      output(result);
    });

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
}
