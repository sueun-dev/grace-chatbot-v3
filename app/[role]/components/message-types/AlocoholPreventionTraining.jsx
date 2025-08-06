import Button from "@/app/[role]/components/Button";
import Image from "next/image";
import React from "react";

const WelcomeToTraining = ({ message, onContinue }) => {
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

        {/* Main Content */}
        <div className="text-center">
          <h1 className="text-[#0E121B] font-bold text-[32px] leading-[40px] mb-[16px]">
            Get Ready to Begin
          </h1>
          <p className="text-[#666F8D] text-[16px] leading-[24px] mb-[24px] max-w-[500px] mx-auto">
            Now that you've completed the initial questions, your personalized
            alcohol prevention training is about to begin. Click below to get
            started.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={() => onContinue("continue_welcome")}
              className="px-[32px] py-[12px] text-[16px] font-medium"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeToTraining;
