import Image from "next/image";
import React from "react";

const MotivationalMessage = ({ message }) => {
  return (
    <div className="flex items-center gap-[12px] border-[2px] border-[#4F46E5] box-shadow rounded-[16px] p-[24px] bg-gradient-to-r from-purple-50 to-blue-50">
      <div className="min-w-[24px] min-h-[24px] rounded-full self-start">
        <Image
          src="/element.png"
          alt="element"
          width={24}
          height={24}
          className="rounded-full"
        />
      </div>
      <div className="flex flex-col gap-[8px] w-full">
        <div className="flex items-center gap-[12px]">
          <h3 className="text-[#4F46E5] font-semibold text-[14px] leading-[130%]">
            Dr. Sky
          </h3>
          <div className="w-[1px] h-[16px] bg-[#4F46E5]"></div>
          <span className="text-[#4F46E5] font-medium text-[12px] leading-[130%]">
            {message.timestamp}
          </span>
        </div>
        <div className="bg-white/80 rounded-[12px] p-[16px] border border-[#4F46E5]/20">
          <p className="text-[#1F2937] font-medium text-[16px] leading-[150%]">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MotivationalMessage;
