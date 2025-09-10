import { useState } from "react";
import { scenarioMessages, scenarioQuestions } from "@/utils/questionnaire";
import { generateTimestamp } from "../components/chatService";

export const useScenarioLearning = () => {
  const [scenarioState, setScenarioState] = useState({
    isActive: false,
    currentScenario: null,
    completedScenarios: [],
    currentStep: 0, // 0: welcome, 1: scenario1, 2: question1, 3: scenario2, 4: question2, 5: thank you
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

  const showScenarioContent = (scenarioKey, step, setMessages) => {
    const scenarioData = scenarioMessages[scenarioKey][`message${step}`];

    const scenarioMsg = {
      id: Date.now(),
      type: "scenario",
      scenarioData: scenarioData,
      scenarioKey: scenarioKey,
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, scenarioMsg]);
  };

  const showScenarioQuestion = (scenarioKey, setMessages) => {
    const questionData = scenarioQuestions[scenarioKey];

    const questionMsg = {
      id: Date.now(),
      type: "scenario",
      questionData: questionData,
      scenarioKey: scenarioKey,
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
        // Continue to next step in scenario
        if (scenarioState.currentStep === 1) {
          setScenarioState((prev) => ({ ...prev, currentStep: 2 }));
          showScenarioQuestion(scenarioState.currentScenario.key, setMessages);
        } else if (scenarioState.currentStep === 3) {
          setScenarioState((prev) => ({ ...prev, currentStep: 4 }));
          showScenarioQuestion(scenarioState.currentScenario.key, setMessages);
        }
        return true;
      } else if (option.type === "continue_question") {
        // Continue to next step after answering question
        if (scenarioState.currentStep === 2) {
          setScenarioState((prev) => ({ ...prev, currentStep: 3 }));
          showScenarioContent(
            scenarioState.currentScenario.key,
            2,
            setMessages
          );
        } else if (scenarioState.currentStep === 4) {
          setScenarioState((prev) => ({ ...prev, currentStep: 5 }));
          handleScenarioComplete(setMessages, startScenarioSimulation);
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
