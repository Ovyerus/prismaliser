import { toPng } from "html-to-image";
import { ReactFlowInstance } from "react-flow-renderer";

const downloadPng = (imgData: string) => {
  const a = document.createElement("a");
  a.setAttribute("download", "prismaliser.png");
  a.setAttribute("href", imgData);
  a.click();
};

const createPngData = (w?: number, h?: number) => {
  return toPng(document.querySelector("div.react-flow"), {
    filter(node?) {
      // As per React-Flows request (only hiding attribution when subscribed to React Flow Pro)
      return !["react-flow__controls" /* , "react-flow__attribution" */].some(
        (className) => {
          if (node?.classList) return node.classList.contains(className);
          else return false;
        }
      );
    },
    width: w,
    height: h,
  });
};

// Merge multiple PNGs together to create a big one, or simply return a single one
const mergePngData = (data: string[]) => {
  if (data.length > 1) {
    console.log(data);
    return "";
  }
  return data[0];
};

export const downloadAsImage = async (reactFlowInstance: ReactFlowInstance) => {
  const imgData: string[] = [];

  // Try to fit everything into the view
  reactFlowInstance.fitView();
  const initialViewport = reactFlowInstance.getViewport();

  console.log(initialViewport);

  // Everything below 0.5 zoom becomes very hard to read. We need to generate it in batches!
  if (initialViewport.zoom >= 0.5) imgData.push(await createPngData());
  else {
    console.error("Unimplemented");
    return;
  }
  downloadPng(mergePngData(imgData));
};
