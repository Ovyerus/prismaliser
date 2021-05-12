import Editor, { useMonaco } from "@monaco-editor/react";
import type { DMMF } from "@prisma/generator-helper";
import type { editor } from "monaco-editor";
import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
} from "react-flow-renderer";
import { useDebounce, useLocalStorage } from "react-use";
import useFetch from "use-http";
import RelationEdge from "~/components/RelationEdge";
import EnumNode from "~/components/EnumNode";

import Layout from "~/components/Layout";
import ModelNode from "~/components/ModelNode";
import { mapDatamodelToNodes } from "~/util";
import * as prismaLanguage from "~/util/prisma-language";
import type { SchemaError } from "~/util/types";

const initial = `
model User {
  id Int @id @default(autoincrement())
  createdAt DateTime @default(now())
  email String @unique
  name String?
  role Role @default(USER)
  posts Post[]
}

model Post {
  id Int @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  published Boolean @default(false)
  title String @db.VarChar(255)
  author User? @relation(fields: [authorId], references: [id])
  authorId Int?
}

enum Role {
  USER
  ADMIN
}
`.trim();

const nodeTypes = {
  model: ModelNode,
  enum: EnumNode,
};

const edgeTypes = {
  relation: RelationEdge,
};

const IndexPage = () => {
  // TODO: perhaps add multiple save states? and save positions too
  const [storedText, setStoredText] = useLocalStorage(
    "prismaliser.text",
    initial
  );
  const [text, setText] = useState(storedText);
  const [schemaErrors, setSchemaErrors] = useState<SchemaError[]>([]);
  const [data, setData] = useState<DMMF.Datamodel | null>(null);
  const elements = useMemo(
    () => (data ? mapDatamodelToNodes(data) : []),
    [data]
  );
  const { post, response, loading } = useFetch("/api");
  const monaco = useMonaco();

  const submit = async () => {
    setStoredText(text);
    const resp = await post({ schema: text });

    if (response.ok) {
      setData(resp);
      setSchemaErrors([]);
    } else if (resp.errors) setSchemaErrors(resp.errors);
    else console.error(resp);
  };

  const format = async () => {
    const resp = await post("/format", { schema: text });
    if (response.ok) setText(resp.formatted);
  };

  useDebounce(submit, 1000, [text]);

  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: "prisma" });
      monaco.languages.setLanguageConfiguration(
        "prisma",
        prismaLanguage.config
      );
      monaco.languages.setMonarchTokensProvider(
        "prisma",
        prismaLanguage.language
      );
    }
  });

  useEffect(() => {
    if (!monaco) return;

    const markers = schemaErrors.map<editor.IMarkerData>((err) => ({
      message: err.reason,
      startLineNumber: Number(err.row),
      endLineNumber: Number(err.row),
      startColumn: 0,
      endColumn: 9999,
      severity: 8,
    }));
    const [model] = monaco.editor.getModels();

    monaco.editor.setModelMarkers(model, "prismaliser", markers);
  }, [schemaErrors]);

  return (
    <Layout>
      <section className="flex flex-col items-start relative border-r-2">
        <Editor
          height="100%"
          language="prisma"
          theme="light"
          loading="Loading..."
          path="schema.prisma"
          options={{
            minimap: { enabled: false },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: true,
            scrollBeyondLastLine: false,
          }}
          value={text}
          onChange={(val) => setText(val)}
        />
        {/* <div>{JSON.stringify(schemaErrors)}</div> */}

        <button
          className="bg-indigo-400 hover:bg-indigo-500 text-white py-2 px-3 rounded-lg absolute left-4 bottom-4 shadow-md hover:shadow-lg transition"
          onClick={format}
        >
          Format
        </button>
        {loading && (
          <div className="w-4 h-4 border-blue-500 border-2 border-l-0 border-b-0 absolute right-4 bottom-4 rounded-full animate-spin" />
        )}
      </section>
      <pre className="overflow-auto border-l-2">
        <ReactFlow
          elements={elements}
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          minZoom={0.1}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={2}
            color="currentColor"
            className="text-gray-200"
          />
          <Controls />
        </ReactFlow>
        <svg width="0" height="0">
          <defs>
            <marker
              id="prismaliser-one"
              markerWidth="12.5"
              markerHeight="12.5"
              viewBox="-10 -10 20 20"
              orient="auto-start-reverse"
              refX="0"
              refY="0"
            >
              <polyline
                className="stroke-current text-gray-400"
                strokeWidth="3"
                strokeLinecap="square"
                fill="none"
                points="-10,-8 -10,8"
              />
            </marker>

            <marker
              id="prismaliser-many"
              markerWidth="12.5"
              markerHeight="12.5"
              viewBox="-10 -10 20 20"
              orient="auto-start-reverse"
              refX="0"
              refY="0"
            >
              <polyline
                className="stroke-current text-gray-400"
                strokeLinejoin="round"
                strokeLinecap="square"
                strokeWidth="1.5"
                fill="none"
                points="0,-8 -10,0 0,8"
              />
            </marker>
          </defs>
        </svg>
        {/* TODO: add a toggleable "debug" view that shows the raw data? */}
        {/* {JSON.stringify(data, null, 4)} */}
      </pre>
    </Layout>
  );
};

export default IndexPage;
