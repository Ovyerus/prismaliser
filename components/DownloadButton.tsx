import downloadIcon from "@iconify/icons-gg/software-download";
import { Icon } from "@iconify/react";
import html2canvas from "html2canvas";
import React from "react";
import { ControlButton } from "reactflow";

const PADDING = 25;

const generateImage = async () => {
  // Find the HTML-Elements
  const element = document.querySelector(".react-flow");
  const viewportElement = document.querySelector(".react-flow__viewport");
  const controlsElement = document.querySelector(".react-flow__controls");
  const attributionElement = document.querySelector(".react-flow__attribution");
  const backgroundElement = document.querySelector(
    "svg.react-flow__background",
  );
  const edgesElement = document.querySelector("svg.react-flow__edges");

  // Those two are required but should always be there anyway
  if (!element || !viewportElement) return;

  // Setting temporary CSS-Styles
  element.setAttribute("style", "overflow: visible; !important");
  const viewportOld = viewportElement.getAttribute("style");
  viewportElement.removeAttribute("style");
  controlsElement?.setAttribute("style", "display:none;");
  attributionElement?.setAttribute("style", "display:none;");
  backgroundElement?.setAttribute(
    "style",
    `width:${element.scrollWidth}px; height:${element.scrollHeight}px;`,
  );
  edgesElement?.setAttribute(
    "style",
    `z-index: 0; width:${element.scrollWidth}px; height:${element.scrollHeight}px;`,
  );

  // Generate the Image-Data from HTML-Element
  const canvas = await html2canvas(element as HTMLElement, {
    width: element.scrollWidth + PADDING,
    height: element.scrollHeight + PADDING,
  });
  const data = canvas.toDataURL();

  // Resetting the CSS-Styles
  element.removeAttribute("style");
  viewportElement.setAttribute("style", viewportOld || "");
  controlsElement?.removeAttribute("style");
  attributionElement?.removeAttribute("style");
  backgroundElement?.setAttribute("style", "width:100%; height:100%;");
  edgesElement?.setAttribute("style", "z-index: 0;");

  // Downloading the Image
  const a = document.createElement("a");
  a.setAttribute("download", "prismaliser.png");
  a.setAttribute("href", data);
  a.click();
};

const DownloadButton = () => {
  const download = async () => {
    await generateImage();
  };

  return (
    <ControlButton title="Download as PNG" onClick={download}>
      <Icon icon={downloadIcon} />
    </ControlButton>
  );
};

export default DownloadButton;
