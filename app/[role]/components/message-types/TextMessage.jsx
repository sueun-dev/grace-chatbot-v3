import Image from "next/image";
import React from "react";

const TextMessage = ({
  message,
  isUser = false,
  icon = "/element.png",
  userName = "Dr. Sky",
}) => {
  return (
    <div
      className={`flex items-center gap-[12px] border-[2px] border-[#F0F2F5] box-shadow rounded-[16px] p-[24px] ${
        isUser ? "bg-white/70" : "bg-white"
      }`}
    >
      {/* <div className="min-w-[24px] min-h-[24px] rounded-full self-start">
        <Image
          src={icon}
          alt="element"
          width={24}
          height={24}
          className="rounded-full"
        />
      </div> */}
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center gap-[12px]">
          {/* <h3
            className={`text-[#19213D] font-medium text-[14px] leading-[130%]`}
          >
            {userName}
          </h3> */}
          <div className="w-[1px] h-[16px] bg-[#F0F2F5]"></div>
          <span className="text-[#666F8D] font-medium text-[12px] leading-[130%]">
            {message.timestamp}
          </span>
        </div>
        <div>
          <p
            className={`text-[#666F8D] font-normal text-[14px] leading-[150%]`}
          >
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TextMessage;
