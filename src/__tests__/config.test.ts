import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveToken, readConfig, writeConfig } from "../config.js";
import * as fs from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MISSIVE_API_TOKEN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("readConfig", () => {
    it("returns empty object when config file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(readConfig()).toEqual({});
    });

    it("parses and returns config when file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ token: "saved-token" }),
      );
      expect(readConfig()).toEqual({ token: "saved-token" });
    });

    it("returns empty object when file contains invalid JSON", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("not json{{{");
      expect(readConfig()).toEqual({});
    });
  });

  describe("writeConfig", () => {
    it("creates config directory and writes JSON file", () => {
      writeConfig({ token: "new-token" });
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining("missive-mcp"),
        { recursive: true },
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("config.json"),
        expect.stringContaining('"token": "new-token"'),
      );
    });
  });

  describe("resolveToken", () => {
    it("returns CLI token when provided (highest priority)", () => {
      process.env.MISSIVE_API_TOKEN = "env-token";
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ token: "saved-token" }),
      );
      expect(resolveToken("cli-token")).toBe("cli-token");
    });

    it("returns env var when no CLI token", () => {
      process.env.MISSIVE_API_TOKEN = "env-token";
      expect(resolveToken()).toBe("env-token");
    });

    it("returns saved config token when no CLI token or env var", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ token: "saved-token" }),
      );
      expect(resolveToken()).toBe("saved-token");
    });

    it("exits process when no token found anywhere", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });
      const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => resolveToken()).toThrow("process.exit called");
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("No Missive API token found"),
      );
    });
  });
});
