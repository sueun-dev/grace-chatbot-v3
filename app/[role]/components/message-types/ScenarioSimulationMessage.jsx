import React, { useState } from "react";
import Button from "../Button";
import Image from "next/image";

const ScenarioSimulationMessage = ({ message, onAnswer }) => {
  const [attempts, setAttempts] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const maxAttempts = 3;

  const handleSubmitAnswer = (userAnswer) => {
    if (!userAnswer.trim()) return;

    const currentAttempt = attempts + 1;
    setAttempts(currentAttempt);

    // Check if answer is appropriate
    const isAppropriate = checkIfAppropriate(
      userAnswer,
      message.scenario || message.scenarioData
    );

    if (isAppropriate) {
      setIsCorrect(true);
      setFeedback("Nice answer.");
      setShowFeedback(true);
    } else {
      setIsCorrect(false);

      if (currentAttempt < maxAttempts) {
        setFeedback("Provides a hint for better answer.");
        setShowHint(true);
      } else {
        setFeedback("That's okay. One possible answer is... Let's keep going.");
        setShowFeedback(true);
      }
    }
  };

  const checkIfAppropriate = (answer, scenarioData) => {
    const lowerAnswer = answer.toLowerCase();

    // Check for inappropriate keywords/phrases
    const inappropriatePatterns = [
      "yes",
      "okay",
      "sure",
      "fine",
      "whatever",
      "i guess",
      "accept",
      "take it",
      "drink",
      "alcohol",
      "beer",
      "wine",
      "shot",
      "let's drink",
      "i'll drink",
      "one drink",
      "just one",
    ];

    // Check for appropriate keywords/phrases
    const appropriatePatterns = [
      "no",
      "no thanks",
      "i'm good",
      "not drinking",
      "don't drink",
      "i'm not drinking",
      "i don't drink",
      "not tonight",
      "i'll pass",
      "water",
      "food",
      "quiet night",
      "cheers to you",
      "maybe next time",
    ];

    // Check for inappropriate patterns
    const hasInappropriate = inappropriatePatterns.some((pattern) =>
      lowerAnswer.includes(pattern)
    );

    // Check for appropriate patterns
    const hasAppropriate = appropriatePatterns.some((pattern) =>
      lowerAnswer.includes(pattern)
    );

    // If answer contains both, check the context
    if (hasInappropriate && hasAppropriate) {
      // More sophisticated logic could be added here
      return (
        hasAppropriate &&
        !lowerAnswer.includes("drink") &&
        !lowerAnswer.includes("alcohol")
      );
    }

    return hasAppropriate && !hasInappropriate;
  };

  const handleContinue = () => {
    setIsCompleted(true);
    setShowFeedback(false);
    setAttempts(0);
    setShowHint(false);
    setIsCorrect(false);
    onAnswer({ type: "continue_simulation" });
  };

  const handleTryAgain = () => {
    setShowFeedback(false);
    setShowHint(false);
    // Reset attempts to allow another try
    setAttempts(attempts);
  };

  const getHint = () => {
    const hints = {
      peer_pressure:
        "Try saying no politely or suggesting an alternative activity.",
      designated_driver:
        "Remind them of your responsibility and suggest a non-alcoholic option.",
      helping_friend:
        "Be firm but caring. Offer alternatives like calling a ride or staying over.",
      default: "Think about saying no politely or suggesting alternatives.",
    };
    const scenarioType =
      message.scenario?.type || message.scenarioData?.scenarioKey || "default";
    return hints[scenarioType] || hints.default;
  };

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

        {/* Scenario Description */}
        <div className="p-[16px] bg-blue-50 rounded-[8px] border border-blue-200">
          <p className="text-[#19213D] text-[16px] leading-[130%] font-medium mb-[8px]">
            Scenario {message.scenario?.id || 1}:{" "}
            {message.scenario?.type || "Practice"}
          </p>
          <p className="text-[#666F8D] text-[14px] leading-[130%]">
            {message.content ||
              message.scenario?.description ||
              message.scenarioData?.description}
          </p>
        </div>

        {/* Example Answers */}
        {/* <div className="mb-[24px]">
          <h3 className="text-[#19213D] font-semibold text-[16px] leading-[130%] mb-[12px]">
            Example Appropriate Answer:
          </h3>
          <div className="p-[12px] bg-green-50 rounded-[8px] border border-green-200">
            <p className="text-[#023E6E] text-[14px] leading-[130%] font-medium">
              "{message.scenarioData.appropriateExample}"
            </p>
          </div>
        </div> */}

        {/* Completed Indicator */}
        {isCompleted && (
          <div className="mb-[16px] p-[12px] bg-gray-50 rounded-[8px] border border-gray-200">
            <div className="flex items-center gap-[8px]">
              <span className="text-[20px]">✅</span>
              <span className="text-[#19213D] text-[14px] leading-[130%] font-medium">
                Scenario completed
              </span>
            </div>
          </div>
        )}

        {/* Attempts Counter */}
        {!showFeedback && !showHint && !isCompleted && (
          <div className="mb-[16px]">
            <span className="text-[#19213D] font-medium text-[14px] leading-[130%]">
              Type your response in the chat input below
            </span>
          </div>
        )}

        {/* Hint */}
        {showHint && !isCompleted && (
          <div className="mb-[16px] p-[16px] bg-yellow-50 rounded-[8px] border border-yellow-200">
            <div className="flex items-center gap-[8px] mb-[8px]">
              <span className="text-[20px]">💡</span>
              <span className="text-[#19213D] font-semibold text-[16px]">
                Hint
              </span>
            </div>
            <p className="text-[#666F8D] text-[14px] leading-[130%]">
              {getHint()}
            </p>
            <div className="mt-[12px]">
              <Button onClick={handleTryAgain}>Try Again</Button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {showFeedback && (
          <div className="mb-[16px] p-[16px] rounded-[8px] border bg-white">
            <div className="flex items-center gap-[8px] mb-[8px]">
              <span className="text-[20px]">{isCorrect ? "✅" : "💬"}</span>
              <span className="text-[#19213D] font-semibold text-[16px]">
                {isCorrect ? "Great job!" : "Feedback"}
              </span>
            </div>
            <p className="text-[#666F8D] text-[14px] leading-[130%]">
              {feedback}
            </p>
            {!isCorrect && attempts >= maxAttempts && (
              <div className="mt-[12px] p-[12px] bg-blue-50 rounded-[8px] border border-blue-200">
                <p className="text-[#023E6E] text-[14px] leading-[130%] font-medium">
                  Example: "No thanks, I'm good with my water. I'm the
                  designated driver tonight."
                </p>
              </div>
            )}
            <div className="mt-[12px]">
              <Button onClick={handleContinue}>
                {isCorrect ? "Continue" : "Let's keep going"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioSimulationMessage;
