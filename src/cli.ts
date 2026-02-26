#!/usr/bin/env node
import { Command } from "commander";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveToken, readConfig, writeConfig } from "./config.js";

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
          config_path: join(homedir(), ".config", "missive-mcp", "config.json"),
        },
        null,
        2,
      ),
    );
  });

program.parse();
