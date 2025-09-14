import React from "react";
import Image from "next/image";
import Button from "@/app/[role]/components/Button";

const WelcomeSection = ({ startQuestionnaire }) => {
  return (
    <div className="flex flex-col justify-center items-center gap-[16px] max-w-[700px]">
      <div>
        <Image src={"/element.png"} width={100} height={100} alt="element" />
      </div>
      <h1 className="text-[#0E121B] font-medium text-[40px] leading-[48px] tracking-[-1%] text-center">
        Welcome Dr. Sky AI
      </h1>
      <p className="text-[#666F8D] font-normal text-[18px] leading-[26px] text-center max-w-[90%]">
        👋 Hi there! I'm here to help you make smarter choices when it comes to
        alcohol. Ready to get started?
      </p>
      <div className="flex gap-[16px] mt-[24px]">
        <Button className="w-fit" onClick={startQuestionnaire}>
          Take Assessment
        </Button>
      </div>
    </div>
  );
};

export default WelcomeSection;
