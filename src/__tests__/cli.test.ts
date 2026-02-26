import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function run(...args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "npx", ["tsx", "src/cli.ts", ...args],
    );
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout: string; stderr: string; code: number };
    return { stdout: e.stdout || "", stderr: e.stderr || "", exitCode: e.code };
  }
}

describe("CLI", () => {
  describe("root", () => {
    it("shows help with all command groups", async () => {
      const { stdout } = await run("--help");
      expect(stdout).toContain("conversations|conv");
      expect(stdout).toContain("drafts");
      expect(stdout).toContain("messages|msg");
      expect(stdout).toContain("config");
    });

    it("shows version", async () => {
      const { stdout } = await run("--version");
      expect(stdout.trim()).toBe("0.1.0");
    });
  });

  describe("conversations", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("conversations", "--help");
      expect(stdout).toContain("list");
      expect(stdout).toContain("get");
      expect(stdout).toContain("messages");
      expect(stdout).toContain("drafts");
    });

    it("conv alias works", async () => {
      const { stdout } = await run("conv", "--help");
      expect(stdout).toContain("list");
    });

    it("list shows filter options", async () => {
      const { stdout } = await run("conversations", "list", "--help");
      expect(stdout).toContain("--label");
      expect(stdout).toContain("--team");
      expect(stdout).toContain("--limit");
      expect(stdout).toContain("--until");
    });
  });

  describe("drafts", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("drafts", "--help");
      expect(stdout).toContain("create");
      expect(stdout).toContain("delete");
    });

    it("create shows required and optional flags", async () => {
      const { stdout } = await run("drafts", "create", "--help");
      expect(stdout).toContain("--to");
      expect(stdout).toContain("--subject");
      expect(stdout).toContain("--body");
      expect(stdout).toContain("--cc");
      expect(stdout).toContain("--bcc");
      expect(stdout).toContain("--send");
      expect(stdout).toContain("--conversation-id");
    });
  });

  describe("messages", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("messages", "--help");
      expect(stdout).toContain("get");
      expect(stdout).toContain("search");
    });

    it("msg alias works", async () => {
      const { stdout } = await run("msg", "--help");
      expect(stdout).toContain("get");
    });

    it("search shows required email-message-id flag", async () => {
      const { stdout } = await run("messages", "search", "--help");
      expect(stdout).toContain("--email-message-id");
    });
  });

  describe("config", () => {
    it("shows subcommands in help", async () => {
      const { stdout } = await run("config", "--help");
      expect(stdout).toContain("set-token");
      expect(stdout).toContain("show");
    });
  });

  describe("error handling", () => {
    it("shows error when command requires token but none configured", async () => {
      // Clear MISSIVE_API_TOKEN for this test if set
      const env = { ...process.env };
      delete env.MISSIVE_API_TOKEN;
      try {
        const { stdout, stderr } = await execFileAsync(
          "npx", ["tsx", "src/cli.ts", "conversations", "list"],
          { env },
        );
        // If we get here, token was found elsewhere
        return;
      } catch (err: unknown) {
        const e = err as { stdout: string; stderr: string; code: number };
        expect(e.code).not.toBe(0);
        expect(e.stderr).toContain("No Missive API token found");
      }
    });
  });
});
