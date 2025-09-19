import React, { useState, useEffect } from "react";
import Button from "../Button";
import Image from "next/image";

const ScenarioMessage = ({ message, onAnswer }) => {
  const [showContinue, setShowContinue] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  useEffect(() => {
    // Countdown timer
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShowContinue(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, []);

  const handleContinue = () => {
    if (message.scenarioData) {
      // Continue to next step
      onAnswer({ type: "continue_scenario" });
    } else if (message.questionData) {
      // Continue to next step after answering question
      onAnswer({ type: "continue_question" });
    }
  };

  const handleAnswerSelect = (option) => {
    // Check if this is the "show answer" option after 3 wrong attempts
    if (option.id === "show_answer" && wrongAttempts >= 3) {
      // Find the correct answer
      const correctOption = message.questionData.options.find(opt => opt.correct);
      setSelectedAnswer(correctOption);
      setShowFeedback(true);
      return;
    }
    
    setSelectedAnswer(option);
    setShowFeedback(true);
    
    // Increment wrong attempts if answer is incorrect
    if (!option.correct) {
      setWrongAttempts(prev => prev + 1);
    }
  };

  const handleFeedbackContinue = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    onAnswer({ type: "continue_question" });
  };

  // If showing question
  if (message.questionData) {
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

          {/* Question */}
          <div className="mb-[16px]">
            <h2 className="text-[#19213D] font-semibold text-[20px] leading-[130%] mb-[16px]">
              {message.questionData.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-[12px] mb-[16px]">
            {message.questionData.options
              .filter(option => {
                // Hide "maybe" option until 3 wrong attempts
                if (option.id === "maybe" || option.value === "maybe") {
                  return wrongAttempts >= 3;
                }
                return true;
              })
              .map((option) => {
                // Transform "maybe" option to "Show Answer" after 3 wrong attempts
                let displayOption = option;
                if ((option.id === "maybe" || option.value === "maybe") && wrongAttempts >= 3) {
                  displayOption = {
                    ...option,
                    id: "show_answer",
                    text: "정답 보기",
                    value: "show_answer"
                  };
                }
                return (
              <button
                key={displayOption.id}
                onClick={() => handleAnswerSelect(displayOption === option ? option : displayOption)}
                disabled={selectedAnswer !== null}
                className={`w-full p-[16px] text-left rounded-[8px] border transition-all duration-200 ${
                  selectedAnswer?.id === option.id || (selectedAnswer?.id === displayOption.id && displayOption.id === "show_answer")
                    ? option.correct || displayOption.id === "show_answer"
                      ? "bg-green-50 border-green-300"
                      : "bg-red-50 border-red-300"
                    : "bg-white border-[#F0F2F5] hover:border-[#023E6E]"
                }`}
              >
                <span className="text-[#19213D] font-medium text-[16px] leading-[130%]">
                  {displayOption.text}
                </span>
              </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && selectedAnswer && (
            <div className="mb-[16px] p-[16px] rounded-[8px] border border-[#F0F2F5] bg-white">
              <div className="flex items-center gap-[8px] mb-[8px]">
                <span className="text-[20px]">
                  {selectedAnswer.correct ? "✅" : "❌"}
                </span>
                <span className="text-[#19213D] font-semibold text-[16px]">
                  {selectedAnswer.correct ? "Correct!" : "Incorrect!"}
                </span>
              </div>
              <p className="text-[#666F8D] text-[14px] leading-[130%]">
                {selectedAnswer.feedback}
              </p>
            </div>
          )}

          {/* Continue Button */}
          {showFeedback && (
            <div className="flex justify-center">
              <Button onClick={handleFeedbackContinue}>Continue</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If showing scenario content
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

        {/* Title */}
        <h1 className="text-[#19213D] font-semibold text-[24px] leading-[130%] mb-[16px]">
          {message.scenarioData.title}
        </h1>

        {/* Learning Points */}
        {message.scenarioData.learningPoints && (
          <div className="mb-[24px]">
            <ul className="space-y-[8px]">
              {message.scenarioData.learningPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-[8px]">
                  <span className="text-[#023E6E] text-[12px] mt-[4px]">•</span>
                  <span className="text-[#666F8D] text-[16px] leading-[130%]">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        {message.scenarioData.sections?.map((section, index) => (
          <div key={index} className="mb-[24px]">
            {section.title && (
              <h2 className="text-[#19213D] font-semibold text-[18px] leading-[130%] mb-[12px]">
                {section.title}
              </h2>
            )}

            {section.content && (
              <p className="text-[#666F8D] text-[16px] leading-[130%] mb-[12px]">
                {section.content}
              </p>
            )}

            {section.list && (
              <div className="space-y-[8px]">
                {section.list.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start gap-[8px]">
                    <span className="text-[#023E6E] text-[12px] mt-[4px]">
                      •
                    </span>
                    <span className="text-[#666F8D] text-[16px] leading-[130%]">
                      {typeof item === "string" ? (
                        item
                      ) : (
                        <span>
                          <span className="font-medium">{item.label}</span>
                          <span className="text-[#023E6E] font-medium">
                            {" "}
                            ({item.value})
                          </span>
                          <span className="text-[#666F8D]">
                            {" "}
                            - {item.emphasis}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Tip */}
        {message.scenarioData.tip && (
          <div className="mb-[24px] p-[16px] bg-blue-50 rounded-[8px] border border-blue-200">
            <p className="text-[#023E6E] text-[14px] leading-[130%] font-medium">
              {message.scenarioData.tip}
            </p>
          </div>
        )}

        {/* Countdown or Continue Button */}
        {!showContinue ? (
          <div className="flex justify-center">
            <div className="flex items-center gap-[8px] px-[16px] py-[8px] bg-blue-50 rounded-[8px] border border-blue-200">
              <div className="w-[8px] h-[8px] bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[#023E6E] text-[14px] font-medium">
                Continue button will appear in {countdown} second
                {countdown !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button onClick={handleContinue}>Continue</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioMessage;
