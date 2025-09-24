import Image from "next/image";
import React, { useState } from "react";

const CompletionMessage = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
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
              <span className="text-[24px] font-bold text-[#19213D] tracking-wider">
                {message.content}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="px-[20px] py-[10px] bg-blue-500 text-white rounded-[8px] hover:bg-blue-600 transition-colors font-medium text-[14px]"
            >
              {copied ? "✓ Copied!" : "Copy Code"}
            </button>
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