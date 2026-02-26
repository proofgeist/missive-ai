#!/usr/bin/env node
import { Command } from "commander";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveToken, readConfig, writeConfig } from "./config.js";
import { MissiveClient, MissiveApiError } from "./client.js";
import { registerConversations } from "./commands/conversations.js";
import { registerDrafts } from "./commands/drafts.js";
import { registerMessages } from "./commands/messages.js";

const program = new Command();

program
  .name("missive")
  .description("CLI for the Missive email/messaging API")
  .version("0.1.0")
  .option("--token <token>", "Missive API token");

// Config commands
const config = program.command("config").description("Manage configuration");

config
  .command("set-token <token>")
  .description("Store Missive API token")
  .action((token: string) => {
    writeConfig({ ...readConfig(), token });
    console.log("Token saved.");
  });

config
  .command("show")
  .description("Show current configuration")
  .action(() => {
    const cfg = readConfig();
    const token = cfg.token;
    console.log(
      JSON.stringify(
        {
          token: token ? token.slice(0, 16) + "..." : null,
          config_path: join(homedir(), ".config", "missivecli", "config.json"),
        },
        null,
        2,
      ),
    );
  });

// Lazy client initialization
const getClient = (): MissiveClient => {
  const token = resolveToken(program.opts().token);
  return new MissiveClient(token);
};

// Register command groups
registerConversations(program, getClient);
registerDrafts(program, getClient);
registerMessages(program, getClient);

async function main() {
  try {
    await program.parseAsync();
  } catch (err) {
    if (err instanceof MissiveApiError) {
      console.error(`Missive API error: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
}

main();
