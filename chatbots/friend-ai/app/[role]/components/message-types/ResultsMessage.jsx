import Image from "next/image";
import React from "react";

const ResultsMessage = ({ message, onContinue }) => {
  const { riskLevel, totalScore, summary, showFreeChatOption } = message;

  const getRiskLevelColor = (level) => {
    if (level.includes("Low Risk"))
      return "bg-green-100 border-green-500 text-green-700";
    if (level.includes("Moderate Risk"))
      return "bg-yellow-100 border-yellow-500 text-yellow-700";
    if (level.includes("High Risk"))
      return "bg-orange-100 border-orange-500 text-orange-700";
    if (level.includes("Severe Risk"))
      return "bg-red-100 border-red-500 text-red-700";
    return "bg-blue-100 border-blue-500 text-blue-700";
  };

  const getRiskLevelIcon = (level) => {
    if (level.includes("Low Risk")) return "🟢";
    if (level.includes("Moderate Risk")) return "🟡";
    if (level.includes("High Risk")) return "🟠";
    if (level.includes("Severe Risk")) return "🔴";
    return "🔵";
  };

  return (
    <div className="flex items-start gap-[12px] border-[2px] border-[#F0F2F5] box-shadow rounded-[16px] p-[24px] bg-white">
      <div className="min-w-[24px] min-h-[24px] rounded-full self-start">
        <Image src={"/element.png"} alt="element" width={24} height={24} />
      </div>
      <div className="flex flex-col gap-[16px] w-full">
        <div className="flex items-center gap-[12px]">
          <h3 className="text-[#19213D] font-medium text-[14px] leading-[130%]">
            Dr. Sky
          </h3>
          <div className="w-[1px] h-[16px] bg-[#F0F2F5]"></div>
          <span className="text-[#666F8D] font-medium text-[12px] leading-[130%]">
            {message.timestamp}
          </span>
        </div>

        {/* Assessment Results */}
        <div className="border-[2px] border-[#F0F2F5] rounded-[12px] p-[20px] bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="flex items-center gap-[12px] mb-[16px]">
            <span className="text-[24px]">
              {getRiskLevelIcon(riskLevel.level)}
            </span>
            <h2 className="text-[#19213D] font-semibold text-[18px] leading-[130%]">
              Assessment Complete
            </h2>
          </div>

          {/* Risk Level */}
          <div
            className={`mb-[16px] p-[16px] rounded-[8px] border-2 ${getRiskLevelColor(
              riskLevel.level
            )}`}
          >
            <div className="flex items-center gap-[8px] mb-[8px]">
              <span className="text-[16px]">
                {getRiskLevelIcon(riskLevel.level)}
              </span>
              <h3 className="font-semibold text-[16px]">{riskLevel.level}</h3>
            </div>
            <p className="text-[14px] leading-[150%]">
              {riskLevel.description}
            </p>
          </div>

          {/* Recommendation */}
          <div className="p-[16px] bg-white rounded-[8px] border border-[#F0F2F5]">
            <h4 className="font-semibold text-[14px] text-[#19213D] mb-[8px]">
              Recommendation:
            </h4>
            <p className="text-[14px] leading-[150%] text-[#666F8D]">
              {riskLevel.recommendation}
            </p>
          </div>
        </div>

        {/* Scenario Simulation Summary */}
        {summary && (
          <div className="mt-[16px] p-[16px] bg-white rounded-[8px] border border-[#F0F2F5]">
            <h4 className="font-semibold text-[14px] text-[#19213D] mb-[8px]">
              Simulation Summary:
            </h4>
            <div className="text-[14px] leading-[150%] text-[#666F8D] space-y-[4px]">
              <p>✅ Total Scenarios: {summary.totalScenarios}</p>
              <p>📝 Total Responses: {summary.totalResponses}</p>
              <p>✓ Appropriate: {summary.appropriateResponses}</p>
              <p>✗ Needs Improvement: {summary.inappropriateResponses}</p>
              <p>📊 Average Score: {summary.averageScore}%</p>
            </div>
          </div>
        )}

        {/* Free Chat Option */}
        {showFreeChatOption && (
          <div className="mt-[16px]">
            <button
              onClick={() => onContinue("start_free_chat")}
              className="w-full py-[12px] px-[24px] bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-[8px] font-medium hover:from-blue-600 hover:to-purple-600 transition-colors"
            >
              Start Free Conversation with AI 💬
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsMessage;
