import { SchemaError } from "./types";

const errRegex =
  /^(?:Error validating.*?:)?(.+?)\n  -->  schema\.prisma:(\d+)\n/;

export const parseDMMFError = (error: string): SchemaError[] =>
  error
    .split("error: ")
    .slice(1)
    .map((msg) => msg.match(errRegex)!.slice(1))
    .map(([reason, row]) => ({ reason: reason!, row: row! }));

export const toUrlSafeB64 = (input: string) =>
  btoa(input).replace(/\//g, "_").replace(/\+/g, "-");
export const fromUrlSafeB64 = (input: string) =>
  atob(input.replace(/_/g, "/").replace(/-/g, "+"));
