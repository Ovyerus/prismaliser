import { DMMF } from "@prisma/generator-helper";
import React, { useState } from "react";
import { useDebounce } from "react-use";
import useFetch from "use-http";

import Layout from "~/components/Layout";

const initial = `
model User {
  id String @id
}
`.trim();

const IndexPage = () => {
  const [text, setText] = useState(initial);
  const [schemaError, setSchemaError] = useState(null);
  const [data, setData] = useState<DMMF.Document | null>(null);
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
      <section className="flex flex-col items-start relative">
        <textarea
          className="w-full h-full resize-none p-4 font-mono overflow-auto bg-gray-100"
          value={text}
          onChange={(ev) => setText(ev.target.value)}
        />
        <button
          className="bg-indigo-400 text-white py-2 px-3 rounded-lg absolute left-4 bottom-4"
          onClick={format}
        >
          format!!
        </button>
        {/* TODO: faster speen */}
        {loading && (
          <div className="w-4 h-4 border-blue-500 border-2 border-l-0 border-b-0 absolute right-4 bottom-4 rounded-full animate-spin" />
        )}
      </section>
      <pre className="overflow-auto">{JSON.stringify(data, null, 4)}</pre>
    </Layout>
  );
};

export default IndexPage;
