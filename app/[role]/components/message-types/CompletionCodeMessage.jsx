import React from "react";
import Image from "next/image";

const CompletionCodeMessage = ({ message }) => {
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

        {/* Completion Code Display */}
        <div className="flex justify-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-[#023E6E] rounded-[12px] p-[24px]">
            <div className="text-center">
              <p className="text-[#666F8D] text-[14px] mb-[8px] font-medium">
                COMPLETION CODE
              </p>
              <div className="bg-white rounded-[8px] px-[32px] py-[16px] border border-[#F0F2F5] shadow-sm">
                <p className="text-[#023E6E] text-[32px] font-bold tracking-[4px] select-all">
                  {message.content}
                </p>
              </div>
              <p className="text-[#666F8D] text-[12px] mt-[12px]">
                Please copy this code and enter it in the original survey
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletionCodeMessage;