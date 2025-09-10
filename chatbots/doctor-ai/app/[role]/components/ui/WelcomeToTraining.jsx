import Image from "next/image";
import React from "react";
import Button from "@/app/[role]/components/Button";
import { ArrowLeft } from "lucide-react";

const WelcomeToTraining = ({ handleGoBack, handleChatBotRedirect }) => {
  return (
    <div className="h-screen w-full max-w-[700px] mx-auto pt-[100px] space-y-[20px]">
      <div>
        <Image src="/logo.svg" alt="logo" width={150} height={80} />
      </div>
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] font-semibold text-black leading-[120%] tracking-0">
          Welcome to the Alcohol Prevention Training
        </h1>
        <p className="text-[16px] font-normal text-gray-600 leading-[150%] tracking-0">
          This training will help you learn more about alcohol, its effects, and
          how to make safer choices. Let's start with a few questions.
        </p>
        <Button onClick={handleChatBotRedirect} className="w-full">
          Continue
        </Button>
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-[#0364b3] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-[16px] h-[16px]" />
          <span className="text-[16px] font-normal leading-[150%] tracking-0">
            Go Back
          </span>
        </button>
      </div>
    </div>
  );
};

export default WelcomeToTraining;
