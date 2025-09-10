"use client";
import React, { useState, useEffect } from "react";
import Header from "./Header";
import ChatList from "./ChatList";
import Sidebar from "./ui/Sidebar";
import clsx from "clsx";
import { useQuestionnaire } from "../hooks/useQuestionnaire";
import { useScenarioLearning } from "../hooks/useScenarioLearning";
import { useScenarioSimulationEnhanced } from "../hooks/useScenarioSimulationEnhanced";
import { useFreeChat } from "../hooks/useFreeChat";
import { useChat } from "../hooks/useChat";
import { useRouter } from "next/navigation";
import { logAction, ACTION_TYPES } from "@/utils/clientLogger";

const StudentChatbot = () => {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(true);
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
  } = useScenarioSimulationEnhanced();
  
  const {
    isFreeChatActive,
    startFreeChat,
    sendMessageToAI,
    endFreeChat,
  } = useFreeChat();

  const currentUser = {
    name: "John Doe",
    avatar: "https://github.com/shadcn.png",
  };

  // Automatically start questionnaire when component mounts
  useEffect(() => {
    // Log chatbot page visit
    logAction({
      actionType: ACTION_TYPES.PAGE_VISITED,
      actionDetails: 'User entered AI chatbot page',
      pageVisited: 'ai-chatbot'
    });
    handleStartQuestionnaire();
  }, []);

  // Handler functions
  const handleShowSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleStartQuestionnaire = async () => {
    startQuestionnaire(setMessages, setShowChatList, setIsLoading);
    
    // Log questionnaire start
    await logAction({
      actionType: ACTION_TYPES.QUESTIONNAIRE_STARTED,
      actionDetails: 'Questionnaire started',
      pageVisited: 'ai-chatbot'
    });
  };

  const handleOptionSelect = async (option) => {
    // Normalize simple option payloads coming from UI components
    const normalized =
      option && typeof option === "object" && (option.type || option.value)
        ? option.type || option.value
        : option;
    
    // Log option selection
    await logAction({
      actionType: ACTION_TYPES.OPTION_SELECTED,
      actionDetails: `Option selected: ${JSON.stringify(option)}`,
      optionSelected: normalized,
      pageVisited: 'ai-chatbot'
    });

    // Handle free chat start
    if (normalized === "start_free_chat") {
      startFreeChat(setMessages);
      return;
    }

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
        <div className="flex-grow p-[40px] flex flex-col justify-center items-center overflow-hidden  bg-[url('/bg-gradient.png')] bg-cover bg-center">
          <ChatList
            messages={messages}
            onSendMessage={(message) => {
              // Check if in free chat mode
              if (isFreeChatActive) {
                sendMessageToAI(message, setMessages, setIsLoading);
              } else {
                handleSendMessage(message, handleUserInput);
              }
            }}
            onOptionSelect={handleOptionSelect}
            isLoading={isLoading}
            currentUser={currentUser}
            pendingInteractiveMessage={pendingInteractiveMessage}
            scenarioMode={simulationState.waitingForInput || isFreeChatActive}
          />
        </div>
      </div>
    </div>
  );
};

export default StudentChatbot;
