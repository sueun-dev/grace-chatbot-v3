import { useState } from "react";
import { generateTimestamp } from "../components/chatService";
import { logAction, ACTION_TYPES } from "@/utils/clientLogger";

export const useScenarioSimulationEnhanced = () => {
  const [simulationState, setSimulationState] = useState({
    isActive: false,
    currentScenario: null,
    scenarios: [],
    currentScenarioIndex: 0,
    retryCount: 0,
    maxRetries: 3,
    evaluationHistory: [],
    waitingForInput: false,
    allResponses: [], // Store all responses for CSV
  });

  // Helper function to get random suggestions
  const getRandomSuggestions = () => {
    const suggestions = [
      "Try to show more empathy in your response",
      "Consider the patient's emotional state",
      "Be more specific about the medical information",
      "Use simpler language for better understanding",
      "Acknowledge the patient's concerns directly",
      "Provide reassurance while being honest",
      "Consider cultural sensitivity in your response"
    ];
    return suggestions.sort(() => 0.5 - Math.random()).slice(0, 3);
  };

  // Evaluate user response using OpenAI
  const evaluateResponse = async (userResponse, scenario) => {
    try {
      const response = await fetch('/api/evaluate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userResponse,
          scenario: scenario.description,
          context: scenario.context
        }),
      });

      const evaluation = await response.json();
      
      // Log evaluation to CSV
      await logAction({
        actionType: ACTION_TYPES.SIMULATION_OPTION_SELECTED,
        actionDetails: `Scenario evaluation: ${evaluation.isAppropriate ? 'Appropriate' : 'Inappropriate'}`,
        response: userResponse,
        score: evaluation.score,
        scenarioType: scenario.type,
        optionSelected: evaluation.isAppropriate ? 'appropriate' : 'inappropriate'
      });

      return evaluation;
    } catch (error) {
      console.error('Error evaluating response:', error);
      return {
        isAppropriate: false,
        reason: 'Evaluation failed',
        suggestions: getRandomSuggestions(),
        score: 0
      };
    }
  };

  // Start scenario simulation
  const startScenarioSimulation = (scenarios, setMessages) => {
    const firstScenario = scenarios[0];
    
    setSimulationState({
      isActive: true,
      currentScenario: firstScenario,
      scenarios: scenarios,
      currentScenarioIndex: 0,
      retryCount: 0,
      maxRetries: 3,
      evaluationHistory: [],
      waitingForInput: true,
      allResponses: [],
    });

    // Add initial scenario message
    const scenarioMsg = {
      id: Date.now(),
      type: "scenario-simulation",
      content: firstScenario.description,
      scenario: firstScenario,
      timestamp: generateTimestamp(),
      isUser: false,
      requiresInput: true,
    };

    setMessages((prev) => [...prev, scenarioMsg]);

    // Log scenario start
    logAction({
      actionType: ACTION_TYPES.SIMULATION_STARTED,
      actionDetails: `Started scenario: ${firstScenario.type}`,
      scenarioType: firstScenario.type
    });
  };

  // Handle user input for scenario
  const handleUserInput = async (userInput, setMessages) => {
    if (!simulationState.waitingForInput || !simulationState.currentScenario) {
      return false;
    }

    const currentScenario = simulationState.currentScenario;
    
    // Add user message
    const userMsg = {
      id: Date.now(),
      type: "text",
      content: userInput,
      timestamp: generateTimestamp(),
      isUser: true,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Store response for CSV
    const responseRecord = {
      scenario: currentScenario.type,
      scenarioIndex: simulationState.currentScenarioIndex,
      retryCount: simulationState.retryCount,
      userResponse: userInput,
      timestamp: new Date().toISOString()
    };

    // Evaluate the response
    const evaluation = await evaluateResponse(userInput, currentScenario);
    
    // Add evaluation to history
    const newEvaluationHistory = [...simulationState.evaluationHistory, {
      ...responseRecord,
      evaluation
    }];

    // Store all responses
    const newAllResponses = [...simulationState.allResponses, {
      ...responseRecord,
      ...evaluation
    }];

    if (evaluation.isAppropriate) {
      // Response is appropriate, move to next scenario
      const aiMsg = {
        id: Date.now() + 1,
        type: "text",
        content: `✅ Good response! ${evaluation.reason}`,
        timestamp: generateTimestamp(),
        isUser: false,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Move to next scenario or complete
      if (simulationState.currentScenarioIndex < simulationState.scenarios.length - 1) {
        setTimeout(() => {
          moveToNextScenario(setMessages, newAllResponses, newEvaluationHistory);
        }, 2000);
      } else {
        setTimeout(() => {
          completeSimulation(setMessages, newAllResponses);
        }, 2000);
      }
    } else {
      // Response is inappropriate
      if (simulationState.retryCount < simulationState.maxRetries - 1) {
        // Can retry
        const suggestions = evaluation.suggestions || getRandomSuggestions();
        const retryMsg = {
          id: Date.now() + 1,
          type: "options",
          content: `⚠️ ${evaluation.reason}\n\nHere are some suggestions to improve your response:`,
          options: [
            { value: "retry", text: "Try again with these suggestions" },
            { value: "skip", text: "Move to next scenario" }
          ],
          suggestions: suggestions,
          timestamp: generateTimestamp(),
          isUser: false,
        };
        
        setMessages((prev) => [...prev, retryMsg]);
        
        setSimulationState((prev) => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          evaluationHistory: newEvaluationHistory,
          allResponses: newAllResponses,
          waitingForInput: false
        }));
      } else {
        // Max retries reached, move to next scenario
        const maxRetriesMsg = {
          id: Date.now() + 1,
          type: "text",
          content: `Maximum attempts (${simulationState.maxRetries}) reached. Moving to next scenario...`,
          timestamp: generateTimestamp(),
          isUser: false,
        };
        
        setMessages((prev) => [...prev, maxRetriesMsg]);
        
        if (simulationState.currentScenarioIndex < simulationState.scenarios.length - 1) {
          setTimeout(() => {
            moveToNextScenario(setMessages, newAllResponses, newEvaluationHistory);
          }, 2000);
        } else {
          setTimeout(() => {
            completeSimulation(setMessages, newAllResponses);
          }, 2000);
        }
      }
    }

    return true;
  };

  // Move to next scenario
  const moveToNextScenario = (setMessages, allResponses, evaluationHistory) => {
    const nextIndex = simulationState.currentScenarioIndex + 1;
    const nextScenario = simulationState.scenarios[nextIndex];

    setSimulationState((prev) => ({
      ...prev,
      currentScenario: nextScenario,
      currentScenarioIndex: nextIndex,
      retryCount: 0,
      waitingForInput: true,
      evaluationHistory: evaluationHistory,
      allResponses: allResponses
    }));

    const scenarioMsg = {
      id: Date.now(),
      type: "scenario-simulation",
      content: nextScenario.description,
      scenario: nextScenario,
      timestamp: generateTimestamp(),
      isUser: false,
      requiresInput: true,
    };

    setMessages((prev) => [...prev, scenarioMsg]);

    // Log new scenario
    logAction({
      actionType: ACTION_TYPES.SIMULATION_STARTED,
      actionDetails: `Started scenario ${nextIndex + 1}: ${nextScenario.type}`,
      scenarioType: nextScenario.type
    });
  };

  // Complete simulation and generate comprehensive CSV
  const completeSimulation = async (setMessages, allResponses) => {
    // Generate summary
    const appropriateCount = allResponses.filter(r => r.isAppropriate).length;
    const totalResponses = allResponses.length;
    const averageScore = allResponses.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses;

    const summaryMsg = {
      id: Date.now(),
      type: "results",
      content: "Scenario Simulation Complete!",
      summary: {
        totalScenarios: simulationState.scenarios.length,
        totalResponses: totalResponses,
        appropriateResponses: appropriateCount,
        inappropriateResponses: totalResponses - appropriateCount,
        averageScore: Math.round(averageScore),
        detailedResponses: allResponses
      },
      timestamp: generateTimestamp(),
      isUser: false,
      showFreeChatOption: true
    };

    setMessages((prev) => [...prev, summaryMsg]);

    // Log completion with all data
    await logAction({
      actionType: ACTION_TYPES.SIMULATION_COMPLETED,
      actionDetails: JSON.stringify({
        summary: summaryMsg.summary,
        allResponses: allResponses
      }),
      score: averageScore
    });

    // Reset simulation state
    setSimulationState({
      isActive: false,
      currentScenario: null,
      scenarios: [],
      currentScenarioIndex: 0,
      retryCount: 0,
      maxRetries: 3,
      evaluationHistory: [],
      waitingForInput: false,
      allResponses: []
    });
  };

  // Handle option selection (retry or skip)
  const handleSimulationOptionSelect = (option, setMessages) => {
    if (!simulationState.isActive) return false;

    // Normalize option value (handle both string and object formats)
    const optionValue = typeof option === 'object' && option.value ? option.value : option;
    

    if (optionValue === "retry") {
      // Show scenario again for retry
      setSimulationState((prev) => ({
        ...prev,
        waitingForInput: true
      }));

      const retryMsg = {
        id: Date.now(),
        type: "text",
        content: "Please try your response again, considering the suggestions provided:",
        timestamp: generateTimestamp(),
        isUser: false,
      };

      setMessages((prev) => [...prev, retryMsg]);
      return true;
    } else if (optionValue === "skip") {
      // Skip to next scenario
      if (simulationState.currentScenarioIndex < simulationState.scenarios.length - 1) {
        moveToNextScenario(setMessages, simulationState.allResponses, simulationState.evaluationHistory);
      } else {
        completeSimulation(setMessages, simulationState.allResponses);
      }
      return true;
    }

    return false;
  };

  const resetSimulationState = () => {
    setSimulationState({
      isActive: false,
      currentScenario: null,
      scenarios: [],
      currentScenarioIndex: 0,
      retryCount: 0,
      maxRetries: 3,
      evaluationHistory: [],
      waitingForInput: false,
      allResponses: []
    });
  };

  return {
    simulationState,
    startScenarioSimulation,
    handleSimulationOptionSelect,
    handleUserInput,
    resetSimulationState,
  };
};