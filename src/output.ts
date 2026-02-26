export function output(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function error(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}
