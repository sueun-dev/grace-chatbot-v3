import { useState } from "react";
import { scenarioMessages, scenarioQuestions } from "@/utils/questionnaire";
import { generateTimestamp } from "../components/chatService";

export const useScenarioLearning = () => {
  const [scenarioState, setScenarioState] = useState({
    isActive: false,
    currentScenario: null,
    completedScenarios: [],
    phase: "content", // 'content' | 'question'
    contentIndex: 0,
    questionIndex: 0,
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
      phase: "content",
      contentIndex: 0,
      questionIndex: 0,
    });

    // Show the first content page
    showScenarioContent(scenarioKey, 0, setMessages);
  };

  const showScenarioContent = (scenarioKey, contentIndex, setMessages) => {
    const scenarioData = scenarioMessages[scenarioKey]?.[contentIndex];

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

  const showScenarioQuestion = (
    scenarioKey,
    contentIndex,
    questionIndex,
    setMessages
  ) => {
    const questionSet = scenarioQuestions[scenarioKey]?.[contentIndex] || [];
    const questionData = questionSet[questionIndex];
    if (!questionData) return;

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
      phase: "content",
      contentIndex: 0,
      questionIndex: 0,
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

    // Start scenario simulation after a delay
    setTimeout(() => {
      if (startScenarioSimulation) {
        startScenarioSimulation(setMessages);
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
      const key = scenarioState.currentScenario.key;
      const contentCount = scenarioMessages[key]?.length || 0;
      const questionsForContent =
        scenarioQuestions[key]?.[scenarioState.contentIndex] || [];

      if (
        option.type === "continue_scenario" &&
        scenarioState.phase === "content"
      ) {
        // If this content has question(s), switch to questions; else advance content
        if (questionsForContent.length > 0) {
          setScenarioState((prev) => ({
            ...prev,
            phase: "question",
            questionIndex: 0,
          }));
          showScenarioQuestion(key, scenarioState.contentIndex, 0, setMessages);
        } else {
          const nextContent = scenarioState.contentIndex + 1;
          if (nextContent < contentCount) {
            setScenarioState((prev) => ({
              ...prev,
              contentIndex: nextContent,
              phase: "content",
            }));
            showScenarioContent(key, nextContent, setMessages);
          } else {
            handleScenarioComplete(setMessages, startScenarioSimulation);
          }
        }
        return true;
      }

      if (
        option.type === "continue_question" &&
        scenarioState.phase === "question"
      ) {
        const nextQuestion = scenarioState.questionIndex + 1;
        if (nextQuestion < questionsForContent.length) {
          setScenarioState((prev) => ({
            ...prev,
            questionIndex: nextQuestion,
          }));
          showScenarioQuestion(
            key,
            scenarioState.contentIndex,
            nextQuestion,
            setMessages
          );
        } else {
          const nextContent = scenarioState.contentIndex + 1;
          if (nextContent < contentCount) {
            setScenarioState((prev) => ({
              ...prev,
              contentIndex: nextContent,
              phase: "content",
              questionIndex: 0,
            }));
            showScenarioContent(key, nextContent, setMessages);
          } else {
            handleScenarioComplete(setMessages, startScenarioSimulation);
          }
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
      phase: "content",
      contentIndex: 0,
      questionIndex: 0,
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
