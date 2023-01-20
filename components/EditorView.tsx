import Editor, { useMonaco } from "@monaco-editor/react";
import React, { useEffect } from "react";

import * as prismaLanguage from "~/util/prisma-language";

const EditorView = ({ value, onChange }: EditorViewProps) => {
  const monaco = useMonaco();

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
  }, [monaco]);

  return (
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
        scrollBeyondLastLine: true,
      }}
      value={value}
      onChange={onChange}
    />
  );
};

export interface EditorViewProps {
  value: string;
  onChange: (text?: string) => void;
}

export default EditorView;
