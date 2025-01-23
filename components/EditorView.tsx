import Editor, { useMonaco } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "~/context/ThemeContext";

import * as prismaLanguage from "~/util/prisma-language";

const EditorView = ({ value, onChange }: EditorViewProps) => {
  const monaco = useMonaco();
  const { theme } = useTheme();

  // State for storing editor width
  const [editorWidth, setEditorWidth] = useState(450);
  const [maxEditorWidth, setmaxEditorWidth] = useState(0);
  const minEditorWidth = 450;
  const mouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const startEditorWidthRef = useRef(0);

  useEffect(() => {
    const defaultEditorWidth = Math.max(window.innerWidth * 0.4, 600);
    setEditorWidth(defaultEditorWidth);

    const defaultMaxEditorWidth = window.innerWidth - 200;
    setmaxEditorWidth(defaultMaxEditorWidth);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownRef.current = true;
    startXRef.current = e.clientX;
    startEditorWidthRef.current = editorWidth;
    document.body.style.cursor = "ew-resize";
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!mouseDownRef.current) return;

    if (mouseDownRef.current) {
      const diff = e.clientX - startXRef.current;
      let newWidth = startEditorWidthRef.current + diff;
      newWidth = Math.max(minEditorWidth, Math.min(newWidth, maxEditorWidth));

      if (newWidth < minEditorWidth) {
        newWidth = minEditorWidth;
      }
      setEditorWidth(newWidth);
    }
  }

  const handleMouseUp = () => {
    mouseDownRef.current = false;
    document.body.style.cursor = "default";
  }

  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: "prisma" });
      monaco.languages.setLanguageConfiguration(
        "prisma",
        prismaLanguage.config,
      );
      monaco.languages.setMonarchTokensProvider(
        "prisma",
        prismaLanguage.language,
      );
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

  }, [monaco, editorWidth]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        width: "100%",
      }}
    >
      <div
        style={{
          width: `${editorWidth}px`,
          height: "100%",
        }}
      >
        <Editor
          height="100%"
          language="prisma"
          theme={`vs-${theme}`}
          loading="Loading..."
          path="schema.prisma"
          options={{
            minimap: { enabled: false },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            scrollBeyondLastLine: true,
          }}
          value={value}
          onChange={onChange}
        />
      </div>
      <div
        style={{
          cursor: "ew-resize",
          width: "5px",
          height: "100%",
          backgroundColor: "#000000",
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export interface EditorViewProps {
  value: string;
  onChange: (text?: string) => void;
}

export default EditorView;
