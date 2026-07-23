import { loader } from "@monaco-editor/react";
// Full monaco-editor import. Cherry-picking contribs is tempting (see git
// history), but monaco 0.56's contrib graph is too entangled for it — the
// context menu silently broke. The bundle takes the hit; Prisma support is
// still our own Monarch grammar (util/prisma-language).
import * as monaco from "monaco-editor";
// eslint-disable-next-line import/default
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

// Bundle the editor locally instead of @monaco-editor/react's default CDN
// loader — the app must work fully offline.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
