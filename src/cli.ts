#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("missive")
  .description("CLI for the Missive email/messaging API")
  .version("0.1.0");

program.parse();
