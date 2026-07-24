import { parseCanonicalResourceUri } from "@atcute/lexicons/syntax";

import { PRISMALISER_COLLECTION } from "~/atproto/constants";
import type { ShareLocation } from "~/atproto/types";
import { fromUrlSafeB64, toUrlSafeB64 } from "~/util";

export const parsePrismaliserAtUri = (value: string) => {
  const parsed = parseCanonicalResourceUri(value);
  if (parsed.collection !== PRISMALISER_COLLECTION || !parsed.rkey)
    throw new SyntaxError("Not a Prismaliser snapshot URI");
  return parsed;
};

export const parseShareLocation = (search: string): ShareLocation => {
  const params = new URLSearchParams(search);
  const at = params.getAll("at");
  const code = params.getAll("code");
  if (at.length + code.length === 0) return { kind: "local" };
  if (at.length !== 1 || code.length !== 0) {
    if (code.length === 1 && at.length === 0)
      try {
        return { kind: "legacy", schema: fromUrlSafeB64(code[0]!) };
      } catch {
        return { kind: "invalid", reason: "Invalid schema-only link" };
      }

    return { kind: "invalid", reason: "Ambiguous share link" };
  }
  try {
    parsePrismaliserAtUri(at[0]!);
    return { kind: "at", uri: at[0]! };
  } catch {
    return { kind: "invalid", reason: "Invalid Prismaliser record link" };
  }
};

export const removeShareParams = (search: string) => {
  const params = new URLSearchParams(search);
  params.delete("at");
  params.delete("code");
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const createAtShareUrl = (uri: string, origin = location.origin) => {
  parsePrismaliserAtUri(uri);
  return `${origin}/?${new URLSearchParams({ at: uri }).toString()}`;
};

export const createLegacyShareUrl = (
  schema: string,
  origin = location.origin,
) =>
  `${origin}/?${new URLSearchParams({ code: toUrlSafeB64(schema) }).toString()}`;
