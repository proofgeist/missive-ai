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
    .description("List conversations")
    .option("--label <id>", "Filter by shared label ID")
    .option("--team <id>", "Filter by team ID")
    .option("--limit <n>", "Max results (default 25, max 50)", parseInt)
    .option("--until <timestamp>", "Pagination: Unix timestamp", parseInt)
    .action(async (opts) => {
      const result = await getClient().listConversations({
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
}
