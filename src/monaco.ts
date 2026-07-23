import { loader } from "@monaco-editor/react";
// Editor core + features only — no built-in languages or language services.
// Prisma support is our own Monarch grammar (util/prisma-language), so the
// full monaco-editor import (~3MB of TS/CSS/HTML/JSON services + ~50
// grammars) buys nothing.
// eslint-disable-next-line import/extensions
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
// eslint-disable-next-line import/default
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

// eslint-disable-next-line import/extensions, import/no-unassigned-import
import "monaco-editor/esm/vs/editor/edcore.main.js";

// Bundle the editor locally instead of @monaco-editor/react's default CDN
// loader — the app must work fully offline.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
