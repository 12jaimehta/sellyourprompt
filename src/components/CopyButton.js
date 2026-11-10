"use client";

import { useState } from "react";

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-light px-3 py-1.5 text-xs"
    >
      {copied ? "Copied!" : "Copy prompt"}
    </button>
  );
}
