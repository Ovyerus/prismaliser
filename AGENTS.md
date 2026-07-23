# Repository Guidelines

## Project Overview

**Prismaliser** is a fully client-side webapp (Vite SPA) that visualises [Prisma](https://prisma.io) schemas as ER diagrams. Users paste a schema into a Monaco editor; the app parses it **entirely in the browser** (via Prisma's schema WASM module) and renders models, enums, and relations (1-1, 1-n, m-n) as an interactive React Flow graph. The build output is plain static files (`dist/`) — no server component at all. It is self-hostable (Docker image published to GHCR); a hosted version lives at [prismaliser.app](https://prismaliser.app).

## Architecture & Data Flow

The app is a single page (`src/App.tsx`) — editor on one side, graph on the other.

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
- **The wasm binary is vendored at `public/prisma_schema_build_bg.wasm`** (2.9 MB) and fetched once, eagerly, by `src/util/prisma.ts`. ⚠️ It is a copy of `node_modules/@prisma/prisma-schema-wasm/src/prisma_schema_build_bg.wasm` — re-copy it when updating the pinned package version, and regenerate the Yarn patch.
- **Error contract:** the wasm throws `Error`s whose message is a JSON `{ error_code, message }` blob. `util/prisma.ts` unwraps it and throws `PrismaSchemaError` (carrying `SchemaError[]` for Monaco markers) when the message contains `error: ` diagnostics, otherwise a plain `Error`. `parseDMMFError` (`util/index.ts`) does the line-number extraction and works unchanged.
- **Monaco is bundled, not CDN-loaded** (`src/monaco.ts`): `loader.config({ monaco })` with a Vite `?worker` import, so the app works fully offline. Consequently `window.monaco` does **not** exist — drive the editor in tests/tools via share links (`?code=`) or DOM, not the monaco global.
- **No global state store** (no zustand/redux/context). State is local `useState` in `src/App.tsx` and `components/FlowView.tsx`; the schema persists via `useLocalStorage("prismaliser.text")` from `react-use`.
- **m-n relations create implicit virtual tables** in `prismaToFlow.ts` (IDs like `_${relationName}`, columns `A`/`B`) — the graph intentionally differs from the raw schema.
- **Layout is not automatic.** On `dmmf` change, nodes regenerate at `{0,0}` (or previous positions) until the user clicks "Disperse nodes", which runs elkjs.
- **Handle ID coupling:** `ModelNode`/`RelationEdge` must agree with the handle ID strings generated in `prismaToFlow.ts` (`relationEdgeSourceHandleId`, `relationEdgeTargetHandleId`, `enumEdgeTargetHandleId`). Change both sides together.
- **Share links:** schema is URL-safe-base64-encoded into `?code=` (`toUrlSafeB64`/`fromUrlSafeB64` in `util/index.ts`). There is no client-side router; query params only, so static hosting needs no rewrite rules.

## Key Directories

| Path             | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `src/`           | All application code. `main.tsx` (entry), `App.tsx` (the whole page), `monaco.ts` (editor setup). |
| `src/components/` | React components: `FlowView`, `ModelNode`, `EnumNode`, `RelationEdge`, `EditorView`, `Layout`, … |
| `src/util/`      | Core logic: `prisma.ts` (client-side parse/format), `prismaToFlow.ts` (DMMF→graph), `layout.ts` (elkjs), `prisma-language.ts` (Monarch grammar), `types.ts` (shared contracts), `index.ts` (helpers). Tests colocated as `*.test.ts`. |
| `src/assets/`    | `style/global.css` — Tailwind entrypoint + custom `.button`/`.focusable` utilities.              |
| `public/`        | Static files copied verbatim into `dist/`: images + the vendored `prisma_schema_build_bg.wasm`.  |
| `.yarn/patches/` | Yarn patch making `@prisma/prisma-schema-wasm` browser-loadable.                                 |

## Development Commands

```bash
yarn dev        # Vite dev server
yarn build      # tsc --noEmit && vite build  → dist/
yarn start      # vite preview (any static file server works too)
yarn test       # vitest run
yarn lint       # eslint --ext ts,tsx .
yarn lint:fix   # eslint --ext ts,tsx --fix .
```

Note: `yarn install` may refuse lockfile changes when a `CI` env var is set (immutable installs) — override with `YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install` when changing dependencies locally.

## Code Conventions & Common Patterns

- **TypeScript strict**: `strict: true`, `noUncheckedIndexedAccess: true`, `isolatedModules: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`.
- **Imports**: internal modules use the `~/*` path alias → `./src/*` (tsconfig `paths` + Vite `resolve.alias`), e.g. `import FlowView from "~/components/FlowView"`. Do not use relative `../` imports for internal modules. `import/order` is enforced with newlines between groups; `import type` groups go last, then `~icons/*` imports in their own trailing group.
- **Components**: arrow-function components only (`react/function-component-definition`), PascalCase files, default export, separate exported `*Props` interface. JSX props must be sorted (`react/jsx-sort-props`).
- **Types**: prefer `interface` over `type` (`@typescript-eslint/consistent-type-definitions`). `switch` statements must be exhaustive. `readonly` parameter properties without an explicit `public` modifier.
- **Styling**: Tailwind utility classes inline + SCSS/CSS modules per component (`Node.module.scss`, `Layout.module.scss`, `FlowView.module.css`). Global styles in `src/assets/style/global.css`. Tailwind scans `./index.html` + `./src/**/*` — keep `content` paths in `tailwind.config.ts` in sync if directories move.
- **Icons**: `unplugin-icons` — import as components from virtual `~icons/<set>/<kebab-name>` modules (e.g. `import GithubIcon from "~icons/simple-icons/github"`), backed by `@iconify-json/simple-icons` + `@iconify-json/gg` data packages. Fully offline/build-time; never the runtime Iconify API, never the deprecated `@iconify/icons-*` per-icon packages. Always pass explicit `width` AND `height` — the generated components default the other dimension to `1em` and will squash the icon otherwise.
- **Error handling**: schema errors surface as thrown `PrismaSchemaError` from `util/prisma.ts` → caught in `App.tsx` → Monaco markers. Unexpected errors are `console.error`ed. No React error boundaries.
- **Async**: `async/await` throughout; wasm calls themselves are synchronous after the one-time async init. `@typescript-eslint/no-misused-promises` is disabled in `.eslintrc.js`.
- **Formatting**: Prettier defaults (80 col, 2 spaces, semicolons, double quotes, trailing commas) with only `proseWrap: "always"` and `htmlWhitespaceSensitivity: "ignore"` overridden in `.prettierrc`. Formatting violations fail lint (`prettier/prettier: error`). EditorConfig: 2-space indent, LF, final newline.

## Important Files

| File                    | Role                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| `index.html`            | Vite entry HTML; all meta/OG/Twitter tags live here.                          |
| `src/main.tsx`          | App entrypoint: font/style imports, Umami injection, `createRoot`.            |
| `src/monaco.ts`         | Bundles Monaco locally (`loader.config` + `?worker`); imports `editor.api` + `edcore.main` only — editor core and features, no built-in languages/language services. Deep imports need `.js` extensions (exports-map resolution); the `import/extensions` lint disables there are load-bearing. |
| `src/App.tsx`           | Main page; owns schema state, debounced parse, error markers, share links.    |
| `src/util/prisma.ts`    | Client-side `getDMMF`/`formatSchema` wrappers; wasm init + error unwrapping.  |
| `src/util/prismaToFlow.ts` | DMMF → React Flow nodes/edges; relation typing; implicit m-n virtual tables. |
| `src/util/layout.ts`    | elkjs layout; node sizes are text-length heuristics (`CHAR_WIDTH = 10`, etc.). elkjs (~1.6MB) is a dynamic import — only fetched on first "Disperse nodes" click. |
| `src/util/types.ts`     | Shared contracts: `ModelNodeData`, `EnumNodeData`, `RelationType`, `SchemaError`. |
| `src/util/prisma-language.ts` | Monaco Monarch grammar + language config for Prisma.                      |
| `public/prisma_schema_build_bg.wasm` | Vendored Prisma parser/formatter wasm binary (keep in sync with pinned package). |
| `.yarn/patches/@prisma-prisma-schema-wasm-*.patch` | Replaces the glue's fs-based self-instantiation with exported `__init(bytes)`. |
| `vite.config.ts`        | React plugin, `~` → `/src` alias, Vitest config.                              |
| `Dockerfile`            | Multi-stage: `node:24-alpine` builds `dist/`, `caddy:alpine` serves it from `/srv` via `Caddyfile`. |
| `Caddyfile`             | Static file server on :80.                                                    |

## Runtime/Tooling Preferences

- **Node 24** is the target (Vite 7+ requires ≥20.19; the repo standardises on 24): `flake.nix` dev shell (`nodejs_24`), `.tool-versions` (`24.18.0`), Dockerfile builder, and `@types/node@^24` all agree.
- **Yarn 4.12.0** (`packageManager` field, vendored at `.yarn/releases/yarn-4.12.0.cjs`) with `nodeLinker: node-modules` (classic `node_modules`, **not** PnP despite `.gitignore` entries). Use `yarn install --immutable` in CI contexts. Bun is not used.
- **Yarn patches**: `@prisma/prisma-schema-wasm` is consumed through a committed `patch:` resolution. To modify the patch: `yarn patch <pkg>`, edit, `yarn patch-commit -s <dir>`. The Dockerfile copies `.yarn/patches` **before** `yarn install --immutable` — this ordering is load-bearing.
- **Nix**: `flake.nix` provides the dev shell; `.envrc` runs `use flake`. CI builds inside `nix develop`. If your shell node is older than 20.19, prefix commands with `nix develop --command`.
- **Key dependency constraints**: React 18 (`@types/react*` pinned to 18.x to match), `reactflow@11` (legacy packages — **not** `@xyflow/react`), `monaco-editor` bundled via `edcore.main` (no built-in languages; main chunk ~4MB — further trimming means cherry-picking contribs, not worth it), `elkjs` lazy-loaded, Tailwind 3, `@prisma/prisma-schema-wasm` pinned exact.
- **Env vars** (both optional, analytics only; baked at build time): `VITE_UMAMI_SITE`, `VITE_UMAMI_HOST` — Umami script loads **directly from the analytics host** (the old Next.js same-origin proxy + IP-munging was dropped with the SPA migration). Dockerfile accepts them as `UMAMI_SITE`/`UMAMI_HOST` build args. No `.env` files are committed.
- **Version control**: repo uses Jujutsu (`.jj/`) colocated with git.

## Testing & QA

- **Vitest** (`yarn test`), Node environment, tests colocated as `src/**/*.test.ts`. The suite covers `util/prisma.ts` (real-wasm integration: parse valid/invalid, format), `util/prismaToFlow.ts` (relation typing, m-n virtual tables, enum edges, handle IDs — fixtures are authentic DMMF produced by the wasm), `util/layout.ts` (sizing heuristics), and `util/index.ts` (error parsing, base64).
- **Wasm in tests**: `typeof window === "undefined"` in Vitest, so `util/prisma.ts`'s auto-init is inert — test files instantiate manually: import `~/util/prisma` first (installs the panic-registry polyfill), then call `__init` on `@prisma/prisma-schema-wasm` with the binary read from `node_modules`. Follow `src/util/prisma.test.ts`.
- **Prisma 7 schema gotcha**: `url` inside `datasource` blocks is rejected (P1012) — don't put it in fixtures.
- **Lint**: `yarn lint` — ESLint via `eslint-config-clarity` (`clarity/react-typescript`): `import`, `prettier`, `@typescript-eslint`, `react`, `react-hooks`, `jsx-a11y`.
- **Build**: `yarn build` type-checks (`tsc --noEmit`) before bundling.

CI (`.github/workflows/push.yaml`, "Test and build", on push/PR) runs via Nix: `nix flake check` → `yarn install --immutable` → `yarn lint` → `yarn test` → `yarn build`, then builds and pushes Docker images (`linux/amd64`, `linux/arm64`) on `master`/`dev`. Verify changes locally with `yarn lint && yarn test && yarn build` before pushing — that is the full QA bar. For behaviour changes, smoke-test the production build (`yarn build && yarn start`) in a browser.
