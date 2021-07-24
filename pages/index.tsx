import Editor, { useMonaco } from "@monaco-editor/react";
import type { DMMF } from "@prisma/generator-helper";
import type { editor } from "monaco-editor";
import React, { useEffect, useState } from "react";
import { useDebounce, useLocalStorage } from "react-use";
import useFetch from "use-http";
import FlowView from "~/components/FlowView";

import Layout from "~/components/Layout";
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

const IndexPage = () => {
  // TODO: multiple save states, and saving node positions as well.
  const [storedText, setStoredText] = useLocalStorage(
    "prismaliser.text",
    initial
  );
  const [text, setText] = useState(storedText);
  const [schemaErrors, setSchemaErrors] = useState<SchemaError[]>([]);
  const [dmmf, setDMMF] = useState<DMMF.Datamodel | null>(null);
  const { post, response, loading } = useFetch("/api");
  const monaco = useMonaco();

  const submit = async () => {
    setStoredText(text);
    const resp = await post({ schema: text });

    if (response.ok) {
      setDMMF(resp);
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
      <section className="relative flex flex-col items-start border-r-2">
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
          className="absolute px-3 py-2 text-white transition bg-indigo-400 rounded-lg shadow-md hover:bg-indigo-500 left-4 bottom-4 hover:shadow-lg"
          onClick={format}
        >
          Format
        </button>
        {loading && (
          <div className="absolute w-4 h-4 border-2 border-b-0 border-l-0 border-blue-500 rounded-full right-4 bottom-4 animate-spin" />
        )}
      </section>
      <pre className="overflow-auto border-l-2">
        <FlowView dmmf={dmmf} />
        {/* TODO: add a toggleable "debug" view that shows the raw data? */}
        {/* {JSON.stringify(data, null, 4)} */}
      </pre>
    </Layout>
  );
};

export default IndexPage;
