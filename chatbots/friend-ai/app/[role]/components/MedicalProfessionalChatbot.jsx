"use client";
import React, { useState, useEffect } from "react";
import Logo from "./Logo";
import Image from "next/image";
import Header from "./Header";
import ChatList from "./ChatList";
import clsx from "clsx";
import { useChat } from "../hooks/useChat";
import { useQuestionnaire } from "../hooks/useQuestionnaire";
import { useScenarioLearning } from "../hooks/useScenarioLearning";
import { useRouter } from "next/navigation";
import { useScenarioSimulation } from "../hooks/useScenarioSimulation";

const MedicalProfessionalChatbot = () => {
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showChatList, setShowChatList] = useState(true);

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

  // Handler Functions
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
      resetSimulationState();
      resetScenarioState();
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
      <div className="flex-grow rounded-[16px] box-shadow border-[1px] border-[#F0F2F5] h-full flex flex-col bg-white">
        {/* Header */}
        <Header
          handleShowSidebar={handleShowSidebar}
          showSidebar={showSidebar}
        />
        {/* Chat Container */}
        <div className="flex-grow p-[40px] flex flex-col justify-center items-center overflow-hidden bg-[url('/bg-gradient.png')] bg-cover bg-center">
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

export default MedicalProfessionalChatbot;

const Sidebar = ({ showSidebar }) => {
  return (
    <div
      className={clsx(
        "absolute  top-0 left-0 bottom-0 overflow-hidden translate-x-[-100%] lg:static lg:w-0 lg:max-w-0 transition-all duration-300 z-index-10 h-full rounded-[16px] flex flex-col justify-center items-center border-[1px] border-[#F0F2F5] box-shadow bg-[url('/medical-bg.png')] bg-cover bg-center",
        showSidebar &&
          "translate-x-0 lg:translate-x-0 lg:w-[296px] lg:max-w-[296px] p-[17px]"
      )}
    >
      <div className="absolute top-[17px] left-[17px]">
        <Logo />
      </div>

      <div className="flex flex-col justify-center items-center gap-[5px] max-w-[90%] mx-auto">
        <div className="h-[480px]">
          <Image
            src="/medical-cartoon.png"
            width={100}
            height={100}
            alt="logo"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};
