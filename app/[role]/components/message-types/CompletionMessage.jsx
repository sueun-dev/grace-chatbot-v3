import Image from "next/image";
import React, { useState } from "react";

const CompletionMessage = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const normalizeCopyText = (value) => {
    if (value === undefined || value === null) return "";
    return String(value);
  };

  const copyWithExecCommand = (text) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const ok =
        typeof document.execCommand === "function" &&
        document.execCommand("copy");
      document.body.removeChild(textarea);
      return Boolean(ok);
    } catch {
      return false;
    }
  };

  const copyTextToClipboard = async (value) => {
    const text = normalizeCopyText(value).trim();
    if (!text) return false;

    const clipboard = navigator?.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      try {
        await clipboard.writeText(text);
        return true;
      } catch {
        // Fallback below (common on HTTP / older browsers)
      }
    }

    return copyWithExecCommand(text);
  };

  const handleCopy = async () => {
    setCopyError("");
    const ok = await copyTextToClipboard(message.content);
    if (!ok) {
      setCopyError("Copy failed. Please select the code and copy manually.");
      return;
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start gap-[12px] border-[2px] border-[#F0F2F5] box-shadow rounded-[16px] p-[24px] bg-white">
      <div className="min-w-[24px] min-h-[24px] rounded-full self-start">
        <Image src={"/element.png"} alt="element" width={24} height={24} />
      </div>
      <div className="flex flex-col gap-[16px] w-full">
        <div className="flex items-center gap-[12px]">
          <h3 className="text-[#19213D] font-medium text-[14px] leading-[130%]">
            Sky
          </h3>
          <div className="w-[1px] h-[16px] bg-[#F0F2F5]"></div>
          <span className="text-[#666F8D] font-medium text-[12px] leading-[130%]">
            {message.timestamp}
          </span>
        </div>

        {/* Show content based on message type */}
        {message.type === "completion-code" ? (
          <div className="flex flex-col items-center gap-[12px] w-full">
            <div className="flex items-center gap-[12px] px-[24px] py-[20px] bg-gradient-to-r from-blue-50 to-purple-50 rounded-[12px] border-2 border-blue-200">
              <span className="text-[28px]">🔑</span>
              <span className="text-[24px] font-bold text-[#19213D] tracking-wider select-all">
                {message.content}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="px-[20px] py-[10px] bg-blue-500 text-white rounded-[8px] hover:bg-blue-600 transition-colors font-medium text-[14px]"
            >
              {copied ? "✓ Copied!" : "Copy Code"}
            </button>
            {copyError ? (
              <p className="text-[12px] text-red-600 text-center">{copyError}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-[14px] leading-[150%] text-[#666F8D] whitespace-pre-line">
            {message.content}
          </p>
        )}
      </div>
    </div>
  );
};

export default CompletionMessage;
