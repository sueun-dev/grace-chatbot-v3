import { useState } from "react";
import { QUESTIONNAIRE_SCHEMA } from "@/utils/questionnaire";
import { generateTimestamp } from "../components/chatService";

export const useQuestionnaire = () => {
  const [questionnaireState, setQuestionnaireState] = useState({
    isActive: false,
    currentQuestionId: null,
    responses: {},
    totalScore: 0,
    currentStep: 0,
  });

  // Helper functions for questionnaire
  const getQuestionById = (id) => {
    return QUESTIONNAIRE_SCHEMA.questions.find((q) => q.id === id);
  };

  const getNextQuestion = (currentId, selectedOption) => {
    const currentQuestion = getQuestionById(currentId);
    return currentQuestion?.nextQuestion?.[selectedOption];
  };

  const calculateRiskLevel = (totalScore) => {
    const riskLevel = QUESTIONNAIRE_SCHEMA.scoring.riskLevels.find(
      (level) => totalScore >= level.min && totalScore <= level.max
    );
    return riskLevel || QUESTIONNAIRE_SCHEMA.scoring.riskLevels[0];
  };

  const startQuestionnaire = (setMessages, setShowChatList, setIsLoading) => {
    setQuestionnaireState({
      isActive: true,
      currentQuestionId: "intro_question",
      responses: {},
      totalScore: 0,
      currentStep: 0,
    });

    // Add initial questionnaire message with options
    const initialMsg = {
      id: Date.now(),
      type: "options",
      content:
        "Hello! I'm Sky, here to provide guidance on alcohol awareness and healthier choices. Before we begin, can I ask a couple of quick questions?",
      options: [
        { id: "yes", text: "Yes, let's start", value: "yes" },
        // { id: "no", text: "No, thanks", value: "no" },
      ],
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages([initialMsg]);
    setShowChatList(true);
  };

  const addQuestionMessage = (questionId, setMessages, setIsLoading) => {
    const question = getQuestionById(questionId);
    if (!question) return;

    const questionMsg = {
      id: Date.now(),
      type: question.type,
      content: question.content,
      options: question.options,
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, questionMsg]);

    // If it's a text question with nextQuestion, automatically proceed after a delay
    if (question.type === "text" && question.nextQuestion) {
      setTimeout(() => {
        addQuestionMessage(question.nextQuestion, setMessages, setIsLoading);
        setQuestionnaireState((prev) => ({
          ...prev,
          currentQuestionId: question.nextQuestion,
        }));
      }, 2000);
    }
  };

  const addResultsMessage = (
    totalScore,
    setMessages,
    startScenarioLearning
  ) => {
    const riskLevel = calculateRiskLevel(totalScore);

    const resultsMsg = {
      id: Date.now(),
      type: "results",
      content: `Assessment Complete`,
      riskLevel: riskLevel,
      totalScore: totalScore,
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, resultsMsg]);

    // Automatically start scenario learning after a short delay
    setTimeout(() => {
      startScenarioLearning(riskLevel, setMessages);
    }, 2000);
  };

  const handleQuestionnaireOptionSelect = async (
    option,
    setMessages,
    setIsLoading,
    startScenarioLearning,
    startScenarioSimulation
  ) => {
    const currentQuestion = getQuestionById(
      questionnaireState.currentQuestionId
    );

    // Add user's selection as a message
    const userMsg = {
      id: Date.now(),
      type: "text",
      content: option.text,
      timestamp: generateTimestamp(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMsg]);

    // Handle intro question
    if (questionnaireState.currentQuestionId === "intro_question") {
      if (option.value === "yes") {
        // Show loading state
        setIsLoading(true);
        const loadingMsg = {
          id: Date.now() + 1,
          type: "loading",
          timestamp: generateTimestamp(),
          isUser: false,
        };
        setMessages((prev) => [...prev, loadingMsg]);

        // Start the actual questionnaire after delay
        setTimeout(() => {
          setMessages((prev) => prev.filter((msg) => msg.type !== "loading"));
          addQuestionMessage("age_check", setMessages, setIsLoading);
          setQuestionnaireState((prev) => ({
            ...prev,
            currentQuestionId: "age_check",
          }));
          setIsLoading(false);
        }, 1500);
      } else {
        // End questionnaire
        const endMsg = {
          id: Date.now() + 1,
          type: "text",
          content:
            "Thank you for your time. Feel free to reach out if you have any questions about alcohol awareness in the future.",
          timestamp: generateTimestamp(),
          isUser: false,
        };
        setMessages((prev) => [...prev, endMsg]);
        setQuestionnaireState((prev) => ({ ...prev, isActive: false }));
      }
      return;
    }

    // Update score if question has points
    const points = option.points || 0;
    const newTotalScore = questionnaireState.totalScore + points;

    // Update responses
    const newResponses = {
      ...questionnaireState.responses,
      [questionnaireState.currentQuestionId]: option.value,
    };

    // Get next question
    const nextQuestionId = getNextQuestion(
      questionnaireState.currentQuestionId,
      option.value
    );

    // Update questionnaire state
    setQuestionnaireState((prev) => ({
      ...prev,
      responses: newResponses,
      totalScore: newTotalScore,
      currentStep: prev.currentStep + 1,
    }));

    // Handle special cases
    if (nextQuestionId === "assessment_end") {
      // End assessment early
      const endMsg = {
        id: Date.now() + 1,
        type: "text",
        content:
          "Thank you for your time. Feel free to reach out if you have any questions about alcohol awareness in the future.",
        timestamp: generateTimestamp(),
        isUser: false,
      };
      setMessages((prev) => [...prev, endMsg]);
      setQuestionnaireState((prev) => ({ ...prev, isActive: false }));
      return;
    }

    // Show loading state
    setIsLoading(true);
    const loadingMsg = {
      id: Date.now() + 1,
      type: "loading",
      timestamp: generateTimestamp(),
      isUser: false,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    // Simulate delay and add next question
    setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"));

      if (nextQuestionId === "assessment_results") {
        addResultsMessage(newTotalScore, setMessages, startScenarioLearning);
        setQuestionnaireState((prev) => ({ ...prev, isActive: false }));
      } else {
        addQuestionMessage(nextQuestionId, setMessages, setIsLoading);
        setQuestionnaireState((prev) => ({
          ...prev,
          currentQuestionId: nextQuestionId,
        }));
      }

      setIsLoading(false);
    }, 1500);
  };

  return {
    questionnaireState,
    setQuestionnaireState,
    calculateRiskLevel,
    startQuestionnaire,
    addQuestionMessage,
    addResultsMessage,
    handleQuestionnaireOptionSelect,
  };
};
