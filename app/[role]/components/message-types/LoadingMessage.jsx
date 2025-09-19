import Image from "next/image";
import React from "react";

const LoadingMessage = () => {
  return (
    <div className="flex items-center gap-[12px] border-[2px] border-[#F0F2F5] box-shadow rounded-[16px] p-[24px] bg-white">
      <div className="min-w-[24px] min-h-[24px] rounded-full self-start">
        <Image src={"/element.png"} alt="element" width={24} height={24} />
      </div>
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[12px]">
          <h3 className="text-[#19213D] font-medium text-[14px] leading-[130%]">
            Sky
          </h3>
          <div className="w-[1px] h-[16px] bg-[#F0F2F5]"></div>
          <span className="text-[#666F8D] font-medium text-[12px] leading-[130%]">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="flex items-center gap-[4px]">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-[#666F8D] rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-[#666F8D] rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-[#666F8D] rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
          <span className="text-[#666F8D] font-normal text-[14px] leading-[150%] ml-2">
            Sky is typing...
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoadingMessage;
