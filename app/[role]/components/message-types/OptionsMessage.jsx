"use client";
import Image from "next/image";
import React, { useState } from "react";
import Button from "../Button";
import { ArrowRight } from "lucide-react";

const OptionsMessage = ({ message, onOptionSelect }) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  console.log("🚀 ~ OptionsMessage ~ selectedOption:", selectedOption);

  const handleOptionSelect = (option) => {
    if (onOptionSelect) {
      onOptionSelect(option);
      setIsAnswered(true);
      setSelectedOption(option.value || option);
    }
  };

  const handleRadioChange = (option) => {
    setSelectedOption(option.value || option);
    handleOptionSelect(option);
  };

  // Check if options are objects or strings
  const isOptionObject =
    message.options &&
    message.options.length > 0 &&
    typeof message.options[0] === "object";

  const hasMoreThanTwoOptions = message.options && message.options.length > 2;

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
          {hasMoreThanTwoOptions ? (
            // Radio buttons for 3+ options
            <div className="flex flex-col gap-[12px]">
              {message.options.map((option, index) => {
                const optionText = isOptionObject ? option.text : option;
                const optionValue = isOptionObject ? option.value : option;
                const isSelected = selectedOption === optionValue;

                return (
                  <label
                    key={index}
                    className={`flex items-center gap-[12px] p-[12px] rounded-[8px] border-[1px] cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-[#F0F2F5] bg-white hover:bg-gray-50"
                    } ${isAnswered ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={optionValue}
                      checked={isSelected}
                      onChange={() => handleRadioChange(option)}
                      disabled={isAnswered}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-[14px] font-medium text-[#666F8D]">
                      {optionText}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            // Buttons for 2 or fewer options
            <div className="flex flex-wrap gap-[12px]">
              {message.options.map((option, index) => {
                const optionText = isOptionObject ? option.text : option;
                const isFirstOption = index === 0;

                return (
                  <Button
                    key={index}
                    disabled={isAnswered}
                    onClick={() => handleOptionSelect(option)}
                    className="flex items-center gap-[8px]"
                    isActive={
                      selectedOption === option.value ||
                      selectedOption === option
                    }
                  >
                    {optionText}
                    <ArrowRight size={12} />
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptionsMessage;
