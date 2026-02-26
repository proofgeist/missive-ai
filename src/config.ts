import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".config", "missivecli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  token?: string;
}

export function readConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function writeConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function resolveToken(cliToken?: string): string {
  const token = cliToken || process.env.MISSIVE_API_TOKEN || readConfig().token;
  if (!token) {
    console.error(
      "No Missive API token found. Set MISSIVE_API_TOKEN env var, use --token flag, or run: missive config set-token <token>"
    );
    process.exit(1);
  }
  return token;
}
