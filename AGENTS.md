# Repository Guidelines

## Project Overview

**Prismaliser** is a Next.js webapp that visualises [Prisma](https://prisma.io) schemas as ER diagrams. Users paste a schema into a Monaco editor; the app parses it server-side and renders models, enums, and relations (1-1, 1-n, m-n) as an interactive React Flow graph. It is self-hostable (Docker image published to GHCR); a hosted version lives at [prismaliser.app](https://prismaliser.app).

## Architecture & Data Flow

The app is a single page (`pages/index.tsx`) — editor on one side, graph on the other.

```
Monaco editor (EditorView)
  → schema text, debounced 1s (react-use useDebounce)
  → POST /api            (pages/api/index.ts: getDMMF from @prisma/internals)
  → DMMF.Datamodel JSON  (or 400 with parsed SchemaError[] → Monaco markers)
  → components/FlowView.tsx
      → util/prismaToFlow.ts  (DMMF → React Flow nodes/edges)
      → util/layout.ts        (elkjs layered layout, DOWN)
      → ReactFlow canvas      (ModelNode / EnumNode / RelationEdge)
```

Key points:

- **Parsing is strictly server-side.** API routes use `@prisma/internals` which pulls in Prisma WASM packages; the browser never touches Prisma internals.
- **No global state store** (no zustand/redux/context). State is local `useState` in `pages/index.tsx` and `components/FlowView.tsx`; the schema persists via `useLocalStorage("prismaliser.text")` from `react-use`. HTTP via `use-http`.
- **m-n relations create implicit virtual tables** in `prismaToFlow.ts` (IDs like `_${relationName}`, columns `A`/`B`) — the graph intentionally differs from the raw schema.
- **Layout is not automatic.** On `dmmf` change, nodes regenerate at `{0,0}` (or previous positions) until the user clicks "Disperse nodes", which runs elkjs.
- **Handle ID coupling:** `ModelNode`/`RelationEdge` must agree with the handle ID strings generated in `prismaToFlow.ts` (`relationEdgeSourceHandleId`, `relationEdgeTargetHandleId`, `enumEdgeTargetHandleId`). Change both sides together.
- **Share links:** schema is URL-safe-base64-encoded into `?code=` (`toUrlSafeB64`/`fromUrlSafeB64` in `util/index.ts`).

## Key Directories

| Path          | Purpose                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `pages/`      | Next.js pages. `index.tsx` is the whole app; `api/` holds the parse + format endpoints.          |
| `components/` | React components: `FlowView`, `ModelNode`, `EnumNode`, `RelationEdge`, `EditorView`, `Layout`, … |
| `util/`       | Core logic: `prismaToFlow.ts` (DMMF→graph), `layout.ts` (elkjs), `prisma-language.ts` (Monarch grammar), `types.ts` (shared contracts), `index.ts` (helpers). |
| `assets/`     | `style/global.css` — Tailwind entrypoint + custom `.button`/`.focusable` utilities.              |
| `public/`     | Static images.                                                                                   |

## Development Commands

```bash
yarn dev        # Next.js dev server
yarn build      # next build && node copy-files.ts
yarn start      # node .next/standalone/server.js  (requires prior build)
yarn lint       # eslint --ext ts,tsx .
yarn lint:fix   # eslint --ext ts,tsx --fix .
```

There is **no `test`, `typecheck`, or `format` script**. Type-checking happens implicitly during `next build`.

## Code Conventions & Common Patterns

- **TypeScript strict**: `strict: true`, `noUncheckedIndexedAccess: true`, `isolatedModules: true`.
- **Imports**: internal modules use the `~/*` path alias (`baseUrl: "."`), e.g. `import FlowView from "~/components/FlowView"`. Do not use relative `../` imports for internal modules. `import/order` is enforced with newlines between groups.
- **Components**: arrow-function components only (`react/function-component-definition`), PascalCase files, default export, separate exported `*Props` interface. JSX props must be sorted (`react/jsx-sort-props`).
- **Types**: prefer `interface` over `type` (`@typescript-eslint/consistent-type-definitions`). `switch` statements must be exhaustive.
- **Styling**: Tailwind utility classes inline + SCSS/CSS modules per component (`Node.module.scss`, `Layout.module.scss`, `FlowView.module.css`). Global styles in `assets/style/global.css`.
- **Error handling**: API routes guard `req.method !== "POST"` → 405. Prisma parse errors are stripped of ANSI, parsed via `parseDMMFError` (`util/index.ts`), returned as typed 400s, and surfaced as Monaco editor markers. Unknown errors are `console.error`ed and returned as `ErrorTypes.Other`. No React error boundaries.
- **Async**: `async/await` in API routes; `use-http` hooks client-side. `@typescript-eslint/no-misused-promises` is disabled in `.eslintrc.js`.
- **Formatting**: Prettier defaults (80 col, 2 spaces, semicolons, double quotes, trailing commas) with only `proseWrap: "always"` and `htmlWhitespaceSensitivity: "ignore"` overridden in `.prettierrc`. Formatting violations fail lint (`prettier/prettier: error`). EditorConfig: 2-space indent, LF, final newline.

## Important Files

| File                    | Role                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `pages/index.tsx`       | Main page; owns schema state, debounced submit, error markers, share links.   |
| `pages/api/index.ts`    | POST `/api` — parse schema → DMMF datamodel or structured errors.             |
| `pages/api/format.ts`   | POST `/api/format` — `formatSchema` from `@prisma/internals`.                 |
| `util/prismaToFlow.ts`  | DMMF → React Flow nodes/edges; relation typing; implicit m-n virtual tables.  |
| `util/layout.ts`        | elkjs layout; node sizes are text-length heuristics (`CHAR_WIDTH = 10`, etc.). |
| `util/types.ts`         | Shared contracts: `ModelNodeData`, `EnumNodeData`, `RelationType`, errors.    |
| `util/prisma-language.ts` | Monaco Monarch grammar + language config for Prisma.                        |
| `next.config.js`        | `output: "standalone"` (except Windows); Umami `/script.js` rewrite; ESLint ignored during builds. |
| `copy-files.ts`         | Post-build: copies `public/` and `.next/static` into `.next/standalone` (standalone output omits them). |
| `middleware.ts`         | Proxies only `/api/send` → `${UMAMI_HOST}/api/send` (Umami analytics).        |
| `Dockerfile`            | Multi-stage build on `node:20-alpine3.20`; runs the standalone server via `dumb-init`. |

## Runtime/Tooling Preferences

- **Node 20** is the effective target: `flake.nix` dev shell and `Dockerfile` both use Node 20. ⚠️ `.tool-versions` pins `nodejs 18.18.0` — stale, do not rely on it.
- **Yarn 4.12.0** (`packageManager` field, vendored at `.yarn/releases/yarn-4.12.0.cjs`) with `nodeLinker: node-modules` (classic `node_modules`, **not** PnP despite `.gitignore` entries). Use `yarn install --immutable` in CI contexts. Bun is not used.
- **Nix**: `flake.nix` provides the dev shell (`nodejs_20`, `yarn`); `.envrc` runs `use flake`. CI builds inside `nix develop`.
- **Key dependency constraints**: Next 15 (pages router), React 18, `reactflow@11` (legacy packages — **not** `@xyflow/react`), `elkjs` bundled build, `@monaco-editor/react`, Tailwind 3.
- **Env vars** (both optional, analytics only): `NEXT_PUBLIC_UMAMI_SITE` (client), `UMAMI_HOST` (server rewrites/middleware). No `.env` files are committed.
- **Version control**: repo uses Jujutsu (`.jj/`) colocated with git.

## Testing & QA

**There is no test suite** — no test files, frameworks, or runners. QA is:

1. `yarn lint` — ESLint via `eslint-config-clarity` (`clarity/react-typescript`), which aggregates `import`, `prettier`, `@typescript-eslint`, `react`, `react-hooks`, `jsx-a11y` plugins.
2. `yarn build` — includes TypeScript type-checking.

CI (`.github/workflows/push.yaml`, "Test and build", on push/PR) runs via Nix: `nix flake check` → `yarn install --immutable` → `yarn lint` → `yarn build`, then builds and pushes Docker images (`linux/amd64`, `linux/arm64`) on `master`/`dev`. Verify changes locally with `yarn lint && yarn build` before pushing — that is the full QA bar.
