import * as prismaSchemaWasm from "@prisma/prisma-schema-wasm";

import { parseDMMFError } from "~/util";
import { SchemaError } from "~/util/types";

import type { DMMF } from "@prisma/generator-helper";

interface WasmPanicRegistry {
  message: string;
  set_message(value: string): void;
  get(): string;
}

// The patched @prisma/prisma-schema-wasm glue (see .yarn/patches) references
// these Node-isms if the wasm module panics, so they must exist before the
// module is instantiated below.
const globalScope = globalThis as typeof globalThis & {
  global?: typeof globalThis;
  PRISMA_WASM_PANIC_REGISTRY?: WasmPanicRegistry;
};

globalScope.global = globalThis;
globalScope.PRISMA_WASM_PANIC_REGISTRY ??= {
  message: "",
  set_message(value: string) {
    this.message = `RuntimeError: ${value}`;
  },
  get() {
    return `${this.message}`;
  },
};

// Fetch and instantiate the wasm module once, eagerly — the first parse is
// never far behind page load. Browser-only: during prerendering there is no
// window and nothing to parse. The binary lives in public/ — keep it in sync
// with the pinned @prisma/prisma-schema-wasm version when updating.
const wasmReady: Promise<void> =
  typeof window === "undefined"
    ? Promise.resolve()
    : fetch("/prisma_schema_build_bg.wasm")
        .then((res) => res.arrayBuffer())
        .then((bytes) => prismaSchemaWasm.__init(bytes));

/**
 * Thrown when a schema fails to parse. Carries the per-line errors used for
 * the editor's squiggle markers.
 */
export class PrismaSchemaError extends Error {
  constructor(readonly errors: SchemaError[]) {
    super("The Prisma schema is invalid.");
    this.name = "PrismaSchemaError";
  }
}

/** Parse a Prisma schema into its DMMF datamodel, entirely client-side. */
export const getDMMF = async (datamodel: string): Promise<DMMF.Datamodel> => {
  await wasmReady;

  let json: string;

  try {
    json = prismaSchemaWasm.get_dmmf(
      JSON.stringify({ prismaSchema: datamodel, noColor: true }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // The wasm throws Errors whose message is a JSON
    // `{ error_code, message }` blob — unwrap it if so.
    let unwrapped = message;

    try {
      const parsed: unknown = JSON.parse(message);

      if (
        parsed &&
        typeof parsed === "object" &&
        "message" in parsed &&
        typeof parsed.message === "string"
      )
        unwrapped = parsed.message;
    } catch {
      // Not a JSON error blob — use the raw message.
    }

    if (unwrapped.includes("error: "))
      throw new PrismaSchemaError(parseDMMFError(unwrapped));

    throw new Error(unwrapped);
  }

  // The wasm returns the DMMF document as a JSON string.
  const document = JSON.parse(json) as DMMF.Document;

  return document.datamodel;
};

/** Format a Prisma schema, entirely client-side. */
export const formatSchema = async (schema: string): Promise<string> => {
  await wasmReady;

  const formattingParams = {
    textDocument: { uri: "file:/dev/null" },
    options: { tabSize: 2, insertSpaces: true },
  };
  const json = prismaSchemaWasm.format(
    JSON.stringify([["schema.prisma", schema]]),
    JSON.stringify(formattingParams),
  );

  // The wasm returns `[["schema.prisma", formatted]]` as a JSON string.
  const formatted = JSON.parse(json) as Array<[string, string]>;

  return formatted[0]![1];
};
