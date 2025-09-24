import Image from "next/image";
import React from "react";

const FinalAssessmentMessage = ({ message }) => {
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

        {/* Final Message - NO Assessment Complete title */}
        <div className="flex items-center gap-[8px]">
          <span className="text-[20px]">✨</span>
          <p className="text-[14px] leading-[150%] text-[#19213D]">
            {message.content || "Great job practicing these scenarios! Your answers show self-awareness and healthy decision-making."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinalAssessmentMessage;