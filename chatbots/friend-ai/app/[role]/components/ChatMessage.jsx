import React from "react";
import MultipleChoiceMessage from "./message-types/MultipleChoiceMessage";
import SuccessMessage from "./message-types/SuccessMessage";
import OptionsMessage from "./message-types/OptionsMessage";
import TextMessage from "./message-types/TextMessage";
import LoadingMessage from "./message-types/LoadingMessage";
import ResultsMessage from "./message-types/ResultsMessage";
import ScenarioMessage from "./message-types/ScenarioMessage";
import ScenarioSimulationMessage from "./message-types/ScenarioSimulationMessage";
import MotivationalMessage from "./message-types/MotivationalMessage";
import ThankYouMessage from "./message-types/ThankYouMessage";

const ChatMessage = ({
  message,
  isUser = false,
  onAnswer,
  onOptionSelect,
  currentUser,
  onGoHome,
}) => {
  if (message.type === "loading") {
    return <LoadingMessage />;
  }

  if (isUser) {
    return (
      <TextMessage
        message={message}
        isUser={isUser}
        icon={currentUser?.avatar || "/user-avatar-blue.png"}
        userName={currentUser?.name || "You"}
      />
    );
  }

  // Render different message types based on the message data
  switch (message.type) {
    case "multiple-choice":
      return <MultipleChoiceMessage message={message} onAnswer={onAnswer} />;
    case "success":
      return <SuccessMessage message={message} />;
    case "options":
      return (
        <OptionsMessage message={message} onOptionSelect={onOptionSelect} />
      );
    case "results":
      return <ResultsMessage message={message} onContinue={onOptionSelect} />;
    case "scenario":
      return <ScenarioMessage message={message} onAnswer={onOptionSelect} />;
    case "scenario-simulation":
      return (
        <ScenarioSimulationMessage
          message={message}
          onAnswer={onOptionSelect}
        />
      );
    case "motivational":
      return <MotivationalMessage message={message} />;
    case "thank-you":
      return <ThankYouMessage message={message} onGoHome={onOptionSelect} />;
    case "text":
    default:
      return <TextMessage message={message} />;
  }
};

export default ChatMessage;
