import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerMessages(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const messages = program
    .command("messages")
    .alias("msg")
    .description("Manage messages");

  messages
    .command("get <id>")
    .description("Get a specific message with full body and headers")
    .action(async (id: string) => {
      const result = await getClient().getMessage(id);
      output(result);
    });

  messages
    .command("search")
    .description("Find messages by email Message-ID header")
    .requiredOption("--email-message-id <id>", "Email Message-ID header value")
    .action(async (opts) => {
      const result = await getClient().searchByEmailMessageId(
        opts.emailMessageId,
      );
      output(result);
    });
}
