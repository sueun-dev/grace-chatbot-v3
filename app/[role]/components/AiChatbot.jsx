"use client";
import React, { useState, useEffect } from "react";
import Header from "./Header";
import ChatList from "./ChatList";
import Sidebar from "./ui/Sidebar";
import clsx from "clsx";
import { useQuestionnaire } from "../hooks/useQuestionnaire";
import { useScenarioLearning } from "../hooks/useScenarioLearning";
import { useChat } from "../hooks/useChat";

const AiChatbot = () => {
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

  const currentUser = {
    name: "John Doe",
    avatar: "https://github.com/shadcn.png",
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
    // Handle scenario learning responses
    const scenarioResult = handleScenarioOptionSelect(option, setMessages);
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
    if (option === "go_home") {
      // Reset to welcome screen
      resetChat();
      resetScenarioState();
      setQuestionnaireState({
        isActive: false,
        currentQuestionId: null,
        responses: {},
        totalScore: 0,
        currentStep: 0,
      });
      setShowChatList(false);
      return;
    }

    // If questionnaire is active, handle questionnaire flow
    if (questionnaireState.isActive) {
      handleQuestionnaireOptionSelect(option, setMessages, setIsLoading);
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
        <div className="flex-grow p-[40px] flex flex-col justify-center items-center overflow-hidden  bg-[url('/bg-gradient.png')] bg-cover bg-center">
          <ChatList
            messages={messages}
            onSendMessage={handleSendMessage}
            onOptionSelect={handleOptionSelect}
            isLoading={isLoading}
            currentUser={currentUser}
            pendingInteractiveMessage={pendingInteractiveMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default AiChatbot;
