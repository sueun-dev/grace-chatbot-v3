"use client";
import React, { useState, useEffect } from "react";
import Header from "./Header";
import ChatList from "./ChatList";
import Sidebar from "./ui/Sidebar";
import clsx from "clsx";
import { useQuestionnaire } from "../hooks/useQuestionnaire";
import { useScenarioLearning } from "../hooks/useScenarioLearning";
import { useScenarioSimulation } from "../hooks/useScenarioSimulation";
import { useChat } from "../hooks/useChat";
import { useRouter } from "next/navigation";

const AiChatbot = () => {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChatList, setShowChatList] = useState(true); // Set to true by default

  // Custom hooks
  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    pendingInteractiveMessage,
    setPendingInteractiveMessage,
    handleSendMessage,
    handleGeneralOptionSelect,
    resetChat,
  } = useChat();

  const {
    questionnaireState,
    setQuestionnaireState,
    startQuestionnaire,
    handleQuestionnaireOptionSelect,
  } = useQuestionnaire();

  const {
    scenarioState,
    startScenarioLearning,
    handleScenarioOptionSelect,
    resetScenarioState,
  } = useScenarioLearning();

  const {
    simulationState,
    startScenarioSimulation,
    handleSimulationOptionSelect,
    handleUserInput,
    resetSimulationState,
  } = useScenarioSimulation();

  const currentUser = {
    name: "User",
    avatar: "/user-avatar-blue.png",
  };

  // Automatically start questionnaire when component mounts
  useEffect(() => {
    handleStartQuestionnaire();
  }, []);

  // Handler functions
  const handleShowSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleStartQuestionnaire = () => {
    startQuestionnaire(setMessages, setShowChatList, setIsLoading);
  };

  const handleOptionSelect = async (option) => {
    // Normalize simple option payloads coming from UI components
    const normalized =
      option && typeof option === "object" && (option.type || option.value)
        ? option.type || option.value
        : option;

    // Handle scenario simulation responses
    const simulationResult = handleSimulationOptionSelect(option, setMessages);
    if (simulationResult === true) {
      return;
    }

    // Handle scenario learning responses
    const scenarioResult = handleScenarioOptionSelect(
      option,
      setMessages,
      startScenarioSimulation
    );
    if (scenarioResult === true) {
      return;
    } else if (scenarioResult === "start_training") {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.type === "results") {
        startScenarioLearning(lastMessage.riskLevel, setMessages);
      }
      return;
    }

    // Handle thank you go home button
    if (normalized === "go_home") {
      // Reset to welcome screen
      resetChat();
      resetScenarioState();
      resetSimulationState();
      setQuestionnaireState({
        isActive: false,
        currentQuestionId: null,
        responses: {},
        totalScore: 0,
        currentStep: 0,
      });
      setShowChatList(false);
      router.push("/");
      return;
    }

    // If questionnaire is active, handle questionnaire flow
    if (questionnaireState.isActive) {
      handleQuestionnaireOptionSelect(
        option,
        setMessages,
        setIsLoading,
        startScenarioLearning,
        startScenarioSimulation
      );
      return;
    }

    // Handle general chat options
    handleGeneralOptionSelect(option);
  };

  return (
    <div
      className={clsx(
        "h-full w-full flex flex-row relative overflow-hidden",
        showSidebar && "lg:gap-[10px]"
      )}
    >
      <Sidebar showSidebar={showSidebar} />
      {/* Main Content */}
      <div className="flex-grow rounded-[16px] box-shadow border-[1px] border-[#F0F2F5] h-full flex flex-col">
        {/* Header */}
        <Header
          handleShowSidebar={handleShowSidebar}
          showSidebar={showSidebar}
        />
        {/* Chat Container */}
        <div className="flex-grow p-[20px] flex flex-col justify-center items-center overflow-hidden  bg-[url('/bg-gradient.png')] bg-cover bg-center">
          <ChatList
            messages={messages}
            onSendMessage={(message) =>
              handleSendMessage(message, handleUserInput)
            }
            onOptionSelect={handleOptionSelect}
            isLoading={isLoading}
            currentUser={currentUser}
            pendingInteractiveMessage={pendingInteractiveMessage}
            scenarioMode={simulationState.waitingForInput}
          />
        </div>
      </div>
    </div>
  );
};

export default AiChatbot;
