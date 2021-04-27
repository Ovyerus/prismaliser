import Editor from "@monaco-editor/react";
import { DMMF } from "@prisma/generator-helper";
// import monaco from "monaco-editor";
import React, { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Elements,
} from "react-flow-renderer";
import { useDebounce } from "react-use";
import useFetch from "use-http";
import EnumNode from "~/components/EnumNode";

import Layout from "~/components/Layout";
import ModelNode, { ModelNodeProps } from "~/components/ModelNode";
import { mapDatamodelToNodes } from "~/util";

// TODO: test what is generated from many-to-many
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

const elementTypes = {
  model: ModelNode,
  enum: EnumNode,
};

// TODO: rewrite Prisma's textmate file to whatever this is.
// monaco.languages.register({ id: "prisma" });
// monaco.languages.setMonarchTokensProvider("prisma", {
//   tokenizer: {},

// });

const IndexPage = () => {
  const [text, setText] = useState(initial);
  const [schemaError, setSchemaError] = useState(null);
  const [data, setData] = useState<DMMF.Datamodel | null>(null);
  const elements = useMemo(() => {
    console.log(data);
    return data ? mapDatamodelToNodes(data) : [];
  }, [data]);
  const { post, response, loading, error } = useFetch("/api");

  const submit = async () => {
    const resp = await post({ schema: text });
    console.log(error);
    if (response.ok) setData(resp);
  };

  const format = async () => {
    const resp = await post("/format", { schema: text });
    if (response.ok) setText(resp.formatted);
  };

  useDebounce(submit, 1000, [text]);

  return (
    <Layout>
      <section className="flex flex-col items-start relative border-r-2">
        <Editor
          height="100%"
          language="graphql"
          theme="light"
          loading="Loading..."
          options={{
            minimap: { enabled: false },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: true,
          }}
          value={text}
          onChange={(val) => setText(val)}
        />
        <button
          className="bg-indigo-400 text-white py-2 px-3 rounded-lg absolute left-4 bottom-4"
          onClick={format}
        >
          Format
        </button>
        {/* TODO: faster speen */}
        {loading && (
          <div className="w-4 h-4 border-blue-500 border-2 border-l-0 border-b-0 absolute right-4 bottom-4 rounded-full animate-spin" />
        )}
      </section>
      <pre className="overflow-auto border-l-2">
        <ReactFlow elements={elements} nodeTypes={elementTypes}>
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={2}
            color="currentColor"
            className="text-gray-200"
          />
          <Controls />
        </ReactFlow>
        {/* TODO: add a toggleable "debug" view that shows the raw data */}
        {/* {JSON.stringify(data, null, 4)} */}
      </pre>
    </Layout>
  );
};

export default IndexPage;
