# Repository Guidelines

## Project Overview

**Prismaliser** is a Next.js webapp that visualises [Prisma](https://prisma.io) schemas as ER diagrams. Users paste a schema into a Monaco editor; the app parses it **entirely client-side** (via Prisma's schema WASM module) and renders models, enums, and relations (1-1, 1-n, m-n) as an interactive React Flow graph. The server only serves static files — there are no API routes. It is self-hostable (Docker image published to GHCR); a hosted version lives at [prismaliser.app](https://prismaliser.app).

## Architecture & Data Flow

The app is a single page (`pages/index.tsx`) — editor on one side, graph on the other.

```
Monaco editor (EditorView)
  → schema text, debounced 1s (react-use useDebounce)
  → util/prisma.ts  (getDMMF / formatSchema — client-side WASM wrappers)
      → @prisma/prisma-schema-wasm  (patched; instantiated from
         /prisma_schema_build_bg.wasm fetched out of public/)
  → DMMF.Datamodel  (or PrismaSchemaError → Monaco markers)
  → components/FlowView.tsx
      → util/prismaToFlow.ts  (DMMF → React Flow nodes/edges)
      → util/layout.ts        (elkjs layered layout, DOWN)
      → ReactFlow canvas      (ModelNode / EnumNode / RelationEdge)
```

Key points:

- **Parsing/formatting is client-side WASM.** `@prisma/prisma-schema-wasm` is the Rust `prisma-fmt` engine compiled to WASM — pure JS+WASM, no native code. The published package is a Node-only build (loads the binary via `fs`/`__dirname`), so the repo carries a **Yarn patch** (`.yarn/patches/`, wired via the `patch:` protocol in `package.json`) that replaces the self-instantiating fs tail with an exported `__init(wasmBytes)`.
- **The wasm binary is vendored at `public/prisma_schema_build_bg.wasm`** (2.9 MB) and fetched once, eagerly, by `util/prisma.ts`. ⚠️ It is a copy of `node_modules/@prisma/prisma-schema-wasm/src/prisma_schema_build_bg.wasm` — re-copy it when updating the pinned package version, and regenerate the Yarn patch.
- **Error contract:** the wasm throws `Error`s whose message is a JSON `{ error_code, message }` blob. `util/prisma.ts` unwraps it and throws `PrismaSchemaError` (carrying `SchemaError[]` for Monaco markers) when the message contains `error: ` diagnostics, otherwise a plain `Error`. `parseDMMFError` (`util/index.ts`) does the line-number extraction and works unchanged.
- **No global state store** (no zustand/redux/context). State is local `useState` in `pages/index.tsx` and `components/FlowView.tsx`; the schema persists via `useLocalStorage("prismaliser.text")` from `react-use`.
- **m-n relations create implicit virtual tables** in `prismaToFlow.ts` (IDs like `_${relationName}`, columns `A`/`B`) — the graph intentionally differs from the raw schema.
- **Layout is not automatic.** On `dmmf` change, nodes regenerate at `{0,0}` (or previous positions) until the user clicks "Disperse nodes", which runs elkjs.
- **Handle ID coupling:** `ModelNode`/`RelationEdge` must agree with the handle ID strings generated in `prismaToFlow.ts` (`relationEdgeSourceHandleId`, `relationEdgeTargetHandleId`, `enumEdgeTargetHandleId`). Change both sides together.
- **Share links:** schema is URL-safe-base64-encoded into `?code=` (`toUrlSafeB64`/`fromUrlSafeB64` in `util/index.ts`).

## Key Directories

| Path            | Purpose                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `pages/`        | Next.js pages. `index.tsx` is the whole app; `_app.tsx` sets up fonts/styles/analytics. No `api/`. |
| `components/`   | React components: `FlowView`, `ModelNode`, `EnumNode`, `RelationEdge`, `EditorView`, `Layout`, … |
| `util/`         | Core logic: `prisma.ts` (client-side parse/format), `prismaToFlow.ts` (DMMF→graph), `layout.ts` (elkjs), `prisma-language.ts` (Monarch grammar), `types.ts` (shared contracts), `index.ts` (helpers). |
| `assets/`       | `style/global.css` — Tailwind entrypoint + custom `.button`/`.focusable` utilities.              |
| `public/`       | Static images + the vendored `prisma_schema_build_bg.wasm`.                                      |
| `.yarn/patches/` | Yarn patch making `@prisma/prisma-schema-wasm` browser-loadable.                                |

## Development Commands

```bash
yarn dev        # Next.js dev server
yarn build      # next build && node copy-files.ts
yarn start      # node .next/standalone/server.js  (requires prior build)
yarn lint       # eslint --ext ts,tsx .
yarn lint:fix   # eslint --ext ts,tsx --fix .
```

There is **no `test`, `typecheck`, or `format` script**. Type-checking happens implicitly during `next build`.

Note: `yarn install` may refuse lockfile changes when a `CI` env var is set (immutable installs) — override with `YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install` when changing dependencies locally.

## Code Conventions & Common Patterns

- **TypeScript strict**: `strict: true`, `noUncheckedIndexedAccess: true`, `isolatedModules: true`.
- **Imports**: internal modules use the `~/*` path alias (`baseUrl: "."`), e.g. `import FlowView from "~/components/FlowView"`. Do not use relative `../` imports for internal modules. `import/order` is enforced with newlines between groups; `import type` groups go last.
- **Components**: arrow-function components only (`react/function-component-definition`), PascalCase files, default export, separate exported `*Props` interface. JSX props must be sorted (`react/jsx-sort-props`).
- **Types**: prefer `interface` over `type` (`@typescript-eslint/consistent-type-definitions`). `switch` statements must be exhaustive. `readonly` parameter properties without an explicit `public` modifier.
- **Styling**: Tailwind utility classes inline + SCSS/CSS modules per component (`Node.module.scss`, `Layout.module.scss`, `FlowView.module.css`). Global styles in `assets/style/global.css`.
- **Error handling**: schema errors surface as thrown `PrismaSchemaError` from `util/prisma.ts` → caught in `pages/index.tsx` → Monaco markers. Unexpected errors are `console.error`ed. No React error boundaries.
- **Async**: `async/await` throughout; wasm calls themselves are synchronous after the one-time async init. `@typescript-eslint/no-misused-promises` is disabled in `.eslintrc.js`.
- **Formatting**: Prettier defaults (80 col, 2 spaces, semicolons, double quotes, trailing commas) with only `proseWrap: "always"` and `htmlWhitespaceSensitivity: "ignore"` overridden in `.prettierrc`. Formatting violations fail lint (`prettier/prettier: error`). EditorConfig: 2-space indent, LF, final newline.

## Important Files

| File                    | Role                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `pages/index.tsx`       | Main page; owns schema state, debounced parse, error markers, share links.    |
| `util/prisma.ts`        | Client-side `getDMMF`/`formatSchema` wrappers; wasm init + error unwrapping.  |
| `util/prismaToFlow.ts`  | DMMF → React Flow nodes/edges; relation typing; implicit m-n virtual tables.  |
| `util/layout.ts`        | elkjs layout; node sizes are text-length heuristics (`CHAR_WIDTH = 10`, etc.). |
| `util/types.ts`         | Shared contracts: `ModelNodeData`, `EnumNodeData`, `RelationType`, `SchemaError`. |
| `util/prisma-language.ts` | Monaco Monarch grammar + language config for Prisma.                        |
| `public/prisma_schema_build_bg.wasm` | Vendored Prisma parser/formatter wasm binary (keep in sync with pinned package). |
| `.yarn/patches/@prisma-prisma-schema-wasm-*.patch` | Replaces the glue's fs-based self-instantiation with exported `__init(bytes)`. |
| `next.config.js`        | `output: "standalone"` (except Windows); Umami `/script.js` rewrite; ESLint ignored during builds. |
| `copy-files.ts`         | Post-build: copies `public/` → `.next/standalone/public` and `.next/static` → `.next/standalone/.next/static` (standalone output omits them). |
| `middleware.ts`         | Proxies only `/api/send` → `${UMAMI_HOST}/api/send` (Umami analytics).        |
| `Dockerfile`            | Multi-stage build on `node:20-alpine3.20`; runs the standalone server via `dumb-init`. |

## Runtime/Tooling Preferences

- **Node 20** is the effective target: `flake.nix` dev shell and `Dockerfile` both use Node 20. ⚠️ `.tool-versions` pins `nodejs 18.18.0` — stale, do not rely on it.
- **Yarn 4.12.0** (`packageManager` field, vendored at `.yarn/releases/yarn-4.12.0.cjs`) with `nodeLinker: node-modules` (classic `node_modules`, **not** PnP despite `.gitignore` entries). Use `yarn install --immutable` in CI contexts. Bun is not used.
- **Yarn patches**: `@prisma/prisma-schema-wasm` is consumed through a committed `patch:` resolution. To modify the patch: `yarn patch <pkg>`, edit, `yarn patch-commit -s <dir>`. `.dockerignore` explicitly keeps `.yarn/patches`, so Docker builds see it.
- **Nix**: `flake.nix` provides the dev shell (`nodejs_20`, `yarn`); `.envrc` runs `use flake`. CI builds inside `nix develop`.
- **Key dependency constraints**: Next 15 (pages router), React 18, `reactflow@11` (legacy packages — **not** `@xyflow/react`), `elkjs` bundled build, `@monaco-editor/react`, Tailwind 3, `@prisma/prisma-schema-wasm` pinned exact.
- **Env vars** (both optional, analytics only): `NEXT_PUBLIC_UMAMI_SITE` (client), `UMAMI_HOST` (server rewrites/middleware). No `.env` files are committed.
- **Version control**: repo uses Jujutsu (`.jj/`) colocated with git.

## Testing & QA

**There is no test suite** — no test files, frameworks, or runners. QA is:

1. `yarn lint` — ESLint via `eslint-config-clarity` (`clarity/react-typescript`), which aggregates `import`, `prettier`, `@typescript-eslint`, `react`, `react-hooks`, `jsx-a11y` plugins.
2. `yarn build` — includes TypeScript type-checking.

CI (`.github/workflows/push.yaml`, "Test and build", on push/PR) runs via Nix: `nix flake check` → `yarn install --immutable` → `yarn lint` → `yarn build`, then builds and pushes Docker images (`linux/amd64`, `linux/arm64`) on `master`/`dev`. Verify changes locally with `yarn lint && yarn build` before pushing — that is the full QA bar. For behaviour changes, smoke-test the standalone build (`yarn build && yarn start`) in a browser.
