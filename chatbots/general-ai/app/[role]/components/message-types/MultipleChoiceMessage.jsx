import Image from "next/image";
import React, { useState } from "react";
import Button from "../Button";
import { ArrowRight } from "lucide-react";

const MultipleChoiceMessage = ({ message, onAnswer }) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNext = () => {
    if (selectedOption && onAnswer) {
      onAnswer(selectedOption);
      setIsAnswered(true);
    }
  };

  // Create unique name for radio buttons based on message ID
  const radioGroupName = `choice-${message.id}`;

  return (
    <div className="flex items-center gap-[12px] border-[2px] border-[#F0F2F5] box-shadow rounded-[16px] p-[24px] bg-white">
      <div className="min-w-[24px] min-h-[24px] rounded-full self-start">
        <Image src={"/element.png"} alt="element" width={24} height={24} />
      </div>
      <div className="flex flex-col gap-[8px] w-full">
        <div className="flex items-center gap-[12px]">
          <h3 className="text-[#19213D] font-medium text-[14px] leading-[130%]">
            Dr. Sky
          </h3>
          <div className="w-[1px] h-[16px] bg-[#F0F2F5]"></div>
          <span className="text-[#666F8D] font-medium text-[12px] leading-[130%]">
            {message.timestamp}
          </span>
        </div>
        <div className="flex flex-col gap-[16px]">
          <p className="text-[#666F8D] font-normal text-[14px] leading-[150%]">
            {message.content}
          </p>
          <div className="flex flex-col gap-[8px]">
            {message.options.map((option, index) => (
              <label
                key={index}
                className="flex items-center gap-[6px] cursor-pointer border-[1px] border-[#E3E6EA] rounded-[16px] py-[12px] px-[24px]"
              >
                <input
                  type="radio"
                  name={radioGroupName}
                  value={option}
                  checked={selectedOption === option}
                  onChange={() => handleOptionSelect(option)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <span className="text-[#666F8D] font-normal text-[14px] leading-[150%]">
                  {option}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end mt-[8px]">
            <Button
              onClick={handleNext}
              disabled={!selectedOption || isAnswered}
              className="text-[12px] px-[16px] py-[8px] flex items-center gap-[8px]"
            >
              <span>Next</span>
              <ArrowRight size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultipleChoiceMessage;
