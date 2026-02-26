import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";

export function registerContactBooks(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const books = program
    .command("contact-books")
    .description("Manage contact books");

  books
    .command("list")
    .description("List available contact books")
    .option("--limit <n>", "Max results (default 50, max 200)", parseInt)
    .option("--offset <n>", "Pagination offset (default 0)", parseInt)
    .action(async (opts) => {
      const result = await getClient().listContactBooks({
        limit: opts.limit,
        offset: opts.offset,
      });
      output(result);
    });
}
