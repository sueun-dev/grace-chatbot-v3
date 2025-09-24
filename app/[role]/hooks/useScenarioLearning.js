import { useState } from "react";
import { scenarioMessages, scenarioQuestions } from "@/utils/scenarioContent";
import { generateTimestamp } from "../components/chatService";

export const useScenarioLearning = () => {
  const [scenarioState, setScenarioState] = useState({
    isActive: false,
    currentScenario: null,
    completedScenarios: [],
    currentStep: 0, // 0: welcome, 1: msg1, 2: q1, 3: msg2, 4: q2, 5: msg3, 6: q3, 7: complete
    currentMessageIndex: 1, // Track which message/question we're on
  });

  // Helper function to determine which scenario to show based on risk level
  const getScenarioForRiskLevel = (riskLevel) => {
    const riskLevelName = riskLevel.level.toLowerCase();

    if (
      riskLevelName.includes("severe") ||
      riskLevelName.includes("critical")
    ) {
      return "scenario4"; // Making Positive Changes
    } else if (
      riskLevelName.includes("high") ||
      riskLevelName.includes("intervention")
    ) {
      return "scenario3"; // Understanding Your Relationship with Alcohol
    } else if (
      riskLevelName.includes("moderate") ||
      riskLevelName.includes("caution")
    ) {
      return "scenario2"; // Setting Drinking Limits
    } else {
      return "scenario1"; // What You'll Learn Today (Standard Drink info)
    }
  };

  const startScenarioLearning = (riskLevel, setMessages) => {
    const scenarioKey = getScenarioForRiskLevel(riskLevel);

    setScenarioState({
      isActive: true,
      currentScenario: {
        key: scenarioKey,
        riskLevel: riskLevel,
      },
      completedScenarios: [],
      currentStep: 1, // Start directly at step 1 (first scenario content)
    });

    // Directly show the first scenario content instead of welcome message
    showScenarioContent(scenarioKey, 1, setMessages);
  };

  const showScenarioContent = (scenarioKey, messageNumber, setMessages) => {
    const scenarioData = scenarioMessages[scenarioKey]?.[`message${messageNumber}`];

    if (!scenarioData) return; // Skip if no message exists

    const scenarioMsg = {
      id: Date.now(),
      type: "scenario",
      scenarioData: scenarioData,
      scenarioKey: scenarioKey,
      messageNumber: messageNumber,
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, scenarioMsg]);
  };

  const showScenarioQuestion = (scenarioKey, questionNumber, setMessages) => {
    const questionData = scenarioQuestions[scenarioKey][`question${questionNumber}`];

    if (!questionData) return; // Skip if no question exists

    const questionMsg = {
      id: Date.now(),
      type: "scenario",
      questionData: questionData,
      scenarioKey: scenarioKey,
      questionNumber: questionNumber,
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, questionMsg]);
  };

  const handleScenarioComplete = (setMessages, startScenarioSimulation) => {
    setScenarioState((prev) => ({
      ...prev,
      completedScenarios: [
        ...prev.completedScenarios,
        prev.currentScenario.key,
      ],
      isActive: false,
      currentScenario: null,
      currentStep: 0,
    }));

    // Show completion message and then start scenario simulation
    const completionMsg = {
      id: Date.now(),
      type: "text",
      content:
        "Great! You've completed the learning section. Now let's practice what you've learned with some real-life scenarios.",
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, completionMsg]);

    // Start scenario simulation after a delay with sample scenarios
    setTimeout(() => {
      if (startScenarioSimulation) {
        const scenarios = [
          {
            id: 1,
            type: "peer_pressure",
            description: "You're at a party and your friends are pressuring you to drink more than you're comfortable with. How would you handle this situation?",
            context: "Social situation with peer pressure"
          },
          {
            id: 2,
            type: "designated_driver",
            description: "You agreed to be the designated driver, but someone offers you 'just one drink'. What do you say?",
            context: "Responsibility and commitment scenario"
          },
          {
            id: 3,
            type: "helping_friend",
            description: "Your friend has had too much to drink and wants to drive home. How do you intervene?",
            context: "Friend safety and intervention"
          }
        ];
        startScenarioSimulation(scenarios, setMessages);
      }
    }, 3000);
  };

  const handleScenarioOptionSelect = (
    option,
    setMessages,
    startScenarioSimulation
  ) => {
    // Handle scenario learning responses
    if (option && typeof option === "object" && option.type) {
      if (option.type === "continue_scenario") {
        // After message, show question
        const nextStep = scenarioState.currentStep + 1;
        const questionNumber = Math.floor(nextStep / 2);

        setScenarioState((prev) => ({
          ...prev,
          currentStep: nextStep
        }));

        showScenarioQuestion(scenarioState.currentScenario.key, questionNumber, setMessages);
        return true;
      } else if (option.type === "continue_question") {
        // After question, show next message or complete
        const nextStep = scenarioState.currentStep + 1;
        const messageNumber = Math.floor(nextStep / 2) + 1;

        // Check if we've completed all content (3 messages and 3 questions)
        if (nextStep >= 6) {
          // All content complete, start simulation
          handleScenarioComplete(setMessages, startScenarioSimulation);
        } else {
          // Show next message
          setScenarioState((prev) => ({
            ...prev,
            currentStep: nextStep
          }));

          showScenarioContent(
            scenarioState.currentScenario.key,
            messageNumber,
            setMessages
          );
        }
        return true;
      }
    }

    // Handle Start Training button click (from ResultsMessage) - this should no longer be needed
    if (option === "start_training") {
      return "start_training";
    }

    return false;
  };

  const resetScenarioState = () => {
    setScenarioState({
      isActive: false,
      currentScenario: null,
      completedScenarios: [],
      currentStep: 0,
    });
  };

  return {
    scenarioState,
    setScenarioState,
    startScenarioLearning,
    showScenarioContent,
    showScenarioQuestion,
    handleScenarioComplete,
    handleScenarioOptionSelect,
    resetScenarioState,
  };
};
