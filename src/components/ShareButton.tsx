import React from "react";

export interface ShareButtonProps {
  copied: boolean;
  onClick(): void;
}

const ShareButton = ({ copied, onClick }: ShareButtonProps) => (
  <button
    aria-label="Share diagram"
    className="button floating"
    title="Share diagram"
    type="button"
    onClick={onClick}
  >
    {copied ? "Copied!" : "Share"}
  </button>
);

export default ShareButton;
