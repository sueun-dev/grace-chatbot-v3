import { useState } from "react";
import { generateTimestamp, generateId } from "../components/chatService";
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
    isCompletelyDone: false, // Flag to prevent any interaction after completion
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
      id: generateId(),
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
    // If completely done, allow user to send messages but don't respond
    if (simulationState.isCompletelyDone) {
      // Add user message to show it was sent
      const userMsg = {
        id: generateId(),
        type: "text",
        content: userInput,
        timestamp: generateTimestamp(),
        isUser: true,
      };
      setMessages((prev) => [...prev, userMsg]);

      // Log to CSV but don't respond
      await logAction({
        actionType: ACTION_TYPES.MESSAGE_SENT,
        actionDetails: "User sent message after completion",
        messageContent: userInput,
      });

      return true; // Return true to prevent any other handler from processing
    }

    if (!simulationState.waitingForInput || !simulationState.currentScenario) {
      return false;
    }

    const currentScenario = simulationState.currentScenario;
    
    // Add user message
    const userMsg = {
      id: generateId(),
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

    // Log raw simulation input + evaluation for CSV (one event per attempt)
    await logAction({
      actionType: ACTION_TYPES.SIMULATION_INPUT,
      actionDetails: `Scenario response evaluated: ${evaluation.isAppropriate ? 'appropriate' : 'inappropriate'}`,
      scenarioType: currentScenario.type,
      scenarioIndex: simulationState.currentScenarioIndex,
      retryCount: simulationState.retryCount,
      response: userInput,
      evaluationReason: evaluation.reason,
      evaluationSuggestions: evaluation.suggestions,
      score: evaluation.score,
      isAppropriate: evaluation.isAppropriate
    });
    
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
        id: generateId(),
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
        const isLastAttempt = simulationState.retryCount === simulationState.maxRetries - 2;

        const retryMsg = {
          id: generateId(),
          type: "options",
          content: `⚠️ ${evaluation.reason}\n\nHere are some suggestions to improve your response:`,
          options: isLastAttempt
            ? [
                { value: "retry", text: "Try again with these suggestions" },
                { value: "skip", text: "Move to next scenario" }
              ]
            : [
                { value: "retry", text: "Try again with these suggestions" }
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
          id: generateId(),
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

  // Move to next scenario — derive next state via functional update, side effects outside
  const moveToNextScenario = (setMessages, allResponses, evaluationHistory) => {
    let nextScenario = null;
    let nextIndex;

    setSimulationState((prev) => {
      nextIndex = prev.currentScenarioIndex + 1;
      nextScenario = prev.scenarios[nextIndex];

      return {
        ...prev,
        currentScenario: nextScenario,
        currentScenarioIndex: nextIndex,
        retryCount: 0,
        waitingForInput: true,
        evaluationHistory: evaluationHistory,
        allResponses: allResponses
      };
    });

    // Side effects outside updater
    if (nextScenario) {
      const scenarioMsg = {
        id: generateId(),
        type: "scenario-simulation",
        content: nextScenario.description,
        scenario: nextScenario,
        timestamp: generateTimestamp(),
        isUser: false,
        requiresInput: true,
      };

      setMessages((prevMsgs) => [...prevMsgs, scenarioMsg]);

      logAction({
        actionType: ACTION_TYPES.SIMULATION_STARTED,
        actionDetails: `Started scenario ${nextIndex + 1}: ${nextScenario.type}`,
        scenarioType: nextScenario.type
      });
    }
  };

  // Complete simulation and generate comprehensive CSV
  const completeSimulation = async (setMessages, allResponses) => {
    // Fetch completion code from server (crypto-secure, not exposed in console)
    let completionCode = 'ERROR';
    try {
      const res = await fetch('/api/completion-code', { method: 'POST' });
      const data = await res.json();
      completionCode = data.code;
    } catch {
      // fallback — should not happen in normal operation
    }

    // Generate summary
    const appropriateCount = allResponses.filter(r => r.isAppropriate).length;
    const totalResponses = allResponses.length;
    const averageScore = totalResponses > 0
      ? allResponses.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses
      : 0;

    // Show 4 completion messages instead of results message

    // 1. Great job message
    const completionMsg1 = {
      id: generateId(),
      type: "completion-message",
      content: "Great job practicing these scenarios! Your answers show self-awareness and healthy decision-making.",
      timestamp: generateTimestamp(),
      isUser: false,
    };
    setMessages((prev) => [...prev, completionMsg1]);

    // 2. You're not alone message
    setTimeout(() => {
      const completionMsg2 = {
        id: generateId(),
        type: "completion-message",
        content: "You're not alone in making healthy choices. It's okay to take small steps, ask for help, and keep practicing.",
        timestamp: generateTimestamp(),
        isUser: false,
      };
      setMessages((prev) => [...prev, completionMsg2]);

      // 3. Training complete message
      setTimeout(() => {
        const completionMsg3 = {
          id: generateId(),
          type: "completion-message",
          content: `🎉 You've completed the training!

Thank you for your time and thoughtful participation.
To wrap things up:

1. Please close this browser tab to exit the training.

2. Return to the original survey browser where you started.

3. Please enter the following completion code:`,
          timestamp: generateTimestamp(),
          isUser: false,
        };
        setMessages((prev) => [...prev, completionMsg3]);

        // 4. Completion code
        setTimeout(() => {
          const codeMsg = {
            id: generateId(),
            type: "completion-code",
            content: completionCode,
            timestamp: generateTimestamp(),
            isUser: false,
          };
          setMessages((prev) => [...prev, codeMsg]);
        }, 1000);
      }, 2000);
    }, 1500);

    // Log completion with all data, including dwell time if available
    const dwellStart = typeof window !== "undefined" ? sessionStorage.getItem('dwellStart') : null;
    const dwellTimeMs = dwellStart ? Date.now() - new Date(dwellStart).getTime() : null;

    await logAction({
      actionType: ACTION_TYPES.SIMULATION_COMPLETED,
      actionDetails: 'Simulation completed',
      completionCode,
      totalScenarios: new Set(allResponses.map(r => r.scenario)).size,
      totalResponses: totalResponses,
      appropriateResponses: appropriateCount,
      inappropriateResponses: totalResponses - appropriateCount,
      averageScore: Math.round(averageScore),
      dwellTimeMs: dwellTimeMs !== null ? dwellTimeMs : undefined,
      dwellTimeSeconds: dwellTimeMs !== null ? Math.round(dwellTimeMs / 1000) : undefined
    });

    // Reset simulation state - mark as completely done
    setSimulationState({
      isActive: false,
      currentScenario: null,
      scenarios: [],
      currentScenarioIndex: 0,
      retryCount: 0,
      maxRetries: 3,
      evaluationHistory: [],
      waitingForInput: false,
      allResponses: [],
      isCompletelyDone: true  // Add flag to prevent any further responses
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
        id: generateId(),
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
      allResponses: [],
      isCompletelyDone: false,
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
