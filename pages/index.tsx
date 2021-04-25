import { DMMF } from "@prisma/generator-helper";
import React, { useState } from "react";
import { useDebounce } from "react-use";
import useFetch from "use-http";

const initial = `
model User {
  id String @id
}
`.trim();

const IndexPage = () => {
  const [text, setText] = useState(initial);
  // const [debouncedText, setDebouncedText] = useState(initial);
  const [data, setData] = useState<DMMF.Document | null>(null);
  const { post, response, loading, error } = useFetch("/api");

  const submit = async () => {
    const resp = await post({ schema: text });
    if (response.ok) setData(resp);
  };

  const format = async () => {
    const resp = await post("/format", { schema: text });
    if (response.ok) setText(resp.formatted);
  };

  useDebounce(submit, 1000, [text]);

  return (
    <div>
      <textarea value={text} onChange={(ev) => setText(ev.target.value)} />
      <button onClick={format}>format!!</button>
      {loading && <div>loading...</div>}
      <pre>{JSON.stringify(data, null, 4)}</pre>
    </div>
  );
};

export default IndexPage;
