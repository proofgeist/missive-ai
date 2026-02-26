import type { Command } from "commander";
import { MissiveClient } from "../client.js";
import { output } from "../output.js";
import type { ContactInfo } from "../types.js";

export function registerContacts(
  program: Command,
  getClient: () => MissiveClient,
): void {
  const contacts = program
    .command("contacts")
    .alias("contact")
    .description("Manage contacts");

  contacts
    .command("list")
    .description("List contacts in a contact book")
    .requiredOption("--contact-book <id>", "Contact book ID")
    .option("--search <term>", "Search contacts")
    .option("--limit <n>", "Max results (default 50, max 200)", parseInt)
    .option("--offset <n>", "Pagination offset (default 0)", parseInt)
    .action(async (opts) => {
      const result = await getClient().listContacts({
        contact_book: opts.contactBook,
        search: opts.search,
        limit: opts.limit,
        offset: opts.offset,
      });
      output(result);
    });

  contacts
    .command("get <id>")
    .description("Get a specific contact")
    .action(async (id: string) => {
      const result = await getClient().getContact(id);
      output(result);
    });

  contacts
    .command("create")
    .description("Create a new contact")
    .requiredOption("--contact-book <id>", "Contact book ID")
    .requiredOption("--first-name <name>", "First name")
    .option("--last-name <name>", "Last name")
    .option("--email <address>", "Email address (added as work email)")
    .option("--phone <number>", "Phone number (added as work phone)")
    .option("--notes <text>", "Notes")
    .action(async (opts) => {
      const infos: ContactInfo[] = [];
      if (opts.email) infos.push({ kind: "email", value: opts.email, label: "work" });
      if (opts.phone) infos.push({ kind: "phone_number", value: opts.phone, label: "work" });

      const result = await getClient().createContact({
        contact_book: opts.contactBook,
        first_name: opts.firstName,
        last_name: opts.lastName,
        notes: opts.notes,
        infos: infos.length > 0 ? infos : undefined,
      });
      output(result);
    });

  contacts
    .command("update <id>")
    .description("Update a contact")
    .option("--first-name <name>", "First name")
    .option("--last-name <name>", "Last name")
    .option("--email <address>", "Email address (replaces all emails with this work email)")
    .option("--phone <number>", "Phone number (replaces all phones with this work phone)")
    .option("--notes <text>", "Notes")
    .action(async (id: string, opts) => {
      const infos: ContactInfo[] | undefined =
        (opts.email || opts.phone) ? [] : undefined;
      if (opts.email) infos!.push({ kind: "email", value: opts.email, label: "work" });
      if (opts.phone) infos!.push({ kind: "phone_number", value: opts.phone, label: "work" });

      const result = await getClient().updateContact(id, {
        first_name: opts.firstName,
        last_name: opts.lastName,
        notes: opts.notes,
        infos: infos,
      });
      output(result);
    });
}
