import { useState } from "react";
import { scenarioSimulations } from "@/utils/questionnaire";
import { generateTimestamp, generateId } from "../components/chatService";
import { logAction, ACTION_TYPES } from "@/utils/clientLogger";

export const useScenarioSimulation = () => {
  const [simulationState, setSimulationState] = useState({
    isActive: false,
    currentScenarioIndex: 0,
    completedScenarios: [],
    currentStep: 0, // 0: intro, 1: scenario1, 2: scenario2, 3: scenario3, 4: scenario4, 5: completion
    waitingForInput: false,
    attempts: 0,
  });

  const scenarioKeys = [
    "peer_pressure_party",
    "designated_driver",
    "helping_friend",
  ];

  const defaultScenarioList = scenarioKeys
    .map((key, index) => {
      const scenario = scenarioSimulations[key];
      if (!scenario) return null;
      return {
        id: scenario.id ?? index + 1,
        scenarioKey: scenario.scenarioKey || key,
        ...scenario,
      };
    })
    .filter(Boolean);
  const [scenarioList, setScenarioList] = useState(defaultScenarioList);

  const normalizeScenarioList = (scenarios) => {
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return defaultScenarioList;
    }
    return scenarios.map((scenario, index) => {
      const safeScenario =
        scenario && typeof scenario === "object"
          ? scenario
          : { description: String(scenario ?? "") };
      const scenarioKey =
        safeScenario.scenarioKey || safeScenario.type || `scenario_${index + 1}`;
      return {
        id: safeScenario.id ?? index + 1,
        scenarioKey,
        ...safeScenario,
      };
    });
  };

  const startScenarioSimulation = (arg1, arg2) => {
    const setMessages = typeof arg1 === "function" ? arg1 : arg2;
    if (typeof setMessages !== "function") {
      return;
    }
    const scenarios = Array.isArray(arg1) ? arg1 : null;
    const normalizedScenarios = normalizeScenarioList(scenarios);
    setScenarioList(normalizedScenarios);

    setSimulationState({
      isActive: true,
      currentScenarioIndex: 0,
      completedScenarios: [],
      currentStep: 0,
      waitingForInput: false,
      attempts: 0,
    });

    const firstScenario = normalizedScenarios[0];
    const firstScenarioKey =
      firstScenario?.scenarioKey || firstScenario?.type || scenarioKeys[0];
    void logAction({
      actionType: ACTION_TYPES.SIMULATION_STARTED,
      actionDetails: `Started scenario: ${firstScenarioKey}`,
      scenarioType: firstScenarioKey,
    });

    // Show intro message
    const introMsg = {
      id: generateId(),
      type: "text",
      content:
        "Great! Now let's practice responding to real-life situations. You'll be presented with different scenarios where someone might pressure you to drink. Practice saying no in a way that feels comfortable for you.",
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, introMsg]);

    // Start first scenario after a brief delay
    setTimeout(() => {
      showNextScenario(setMessages, 0, normalizedScenarios);
    }, 2000);
  };

  const showNextScenario = (setMessages, scenarioIndex = null, scenarios = null) => {
    const listToUse =
      Array.isArray(scenarios) && scenarios.length
        ? scenarios
        : scenarioList;
    if (!listToUse || listToUse.length === 0) {
      return;
    }
    const indexToUse =
      scenarioIndex !== null
        ? scenarioIndex
        : simulationState.currentScenarioIndex;
    const scenarioData = listToUse[indexToUse];
    if (!scenarioData) {
      return;
    }

    // Show loading message first
    const loadingMsg = {
      id: generateId(),
      type: "loading",
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prevMessages) => [...prevMessages, loadingMsg]);

    // Show scenario after loading delay
    setTimeout(() => {
      // Remove loading message
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.type !== "loading")
      );

      const scenarioMsg = {
        id: generateId(),
        type: "scenario-simulation",
        scenarioData: scenarioData,
        timestamp: generateTimestamp(),
        isUser: false,
      };

      setMessages((prevMessages) => [...prevMessages, scenarioMsg]);

      // Set waiting for input state and reset attempts
      setSimulationState((prev) => ({
        ...prev,
        currentScenarioIndex: indexToUse,
        waitingForInput: true,
        attempts: 0,
      }));
    }, 1500);
  };

  const handleScenarioComplete = (setMessages) => {
    const listToUse =
      scenarioList.length > 0 ? scenarioList : defaultScenarioList;

    // Use functional update to read current state and derive next values
    let nextIndex;
    setSimulationState((prev) => {
      const currentScenario = listToUse[prev.currentScenarioIndex];
      const currentKey =
        currentScenario?.scenarioKey ||
        currentScenario?.type ||
        scenarioKeys[prev.currentScenarioIndex] ||
        `scenario_${prev.currentScenarioIndex + 1}`;
      nextIndex = prev.currentScenarioIndex + 1;

      return {
        ...prev,
        completedScenarios: [...prev.completedScenarios, currentKey],
        currentScenarioIndex: nextIndex,
      };
    });

    // Side effects outside updater — React safe
    if (nextIndex >= listToUse.length) {
      _showCompletionMessages(setMessages, listToUse);
    } else {
      setTimeout(() => {
        showNextScenario(setMessages, nextIndex, listToUse);
      }, 2000);
    }
  };

  const _showCompletionMessages = (setMessages, listToUse) => {
    // Show final completion messages
    setTimeout(() => {
        const finalAssessmentMsg = {
          id: generateId(),
          type: "completion-message",
          content: "Great job practicing these scenarios! Your answers show self-awareness and healthy decision-making.",
          timestamp: generateTimestamp(),
          isUser: false,
        };

        setMessages((prevMessages) => [...prevMessages, finalAssessmentMsg]);

        // Show "You're not alone" message
        setTimeout(() => {
          const supportMsg = {
            id: generateId(),
            type: "completion-message",
            content: "You're not alone in making healthy choices. It's okay to take small steps, ask for help, and keep practicing.",
            timestamp: generateTimestamp(),
            isUser: false,
          };

          setMessages((prevMessages) => [...prevMessages, supportMsg]);

          // Show training complete message
          setTimeout(() => {
            const trainingCompleteMsg = {
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

            setMessages((prevMessages) => [...prevMessages, trainingCompleteMsg]);

            // Fetch completion code from server
            setTimeout(async () => {
              let completionCode = 'ERROR';
              try {
                const res = await fetch('/api/completion-code', { method: 'POST' });
                const data = await res.json();
                completionCode = data.code;
              } catch {
                // fallback — should not happen in normal operation
              }

              const codeMsg = {
                id: generateId(),
                type: "completion-code",
                content: completionCode,
                timestamp: generateTimestamp(),
                isUser: false,
              };

              void logAction({
                actionType: ACTION_TYPES.SIMULATION_COMPLETED,
                actionDetails: "Simulation completed",
                completionCode,
                totalScenarios: listToUse.length,
              });

              setMessages((prevMessages) => {
                return [...prevMessages, codeMsg];
              });

              // Mark simulation as inactive AFTER all messages are shown
              setSimulationState((prev) => ({
                ...prev,
                isActive: false,
              }));
            }, 1000);
          }, 2000);
        }, 1500);
      }, 2000);
  };

  const handleSimulationOptionSelect = (option, setMessages) => {
    // Support object payloads like { type: "continue_simulation" }
    if (
      option &&
      typeof option === "object" &&
      option.type === "continue_simulation"
    ) {
      handleScenarioComplete(setMessages);
      return true;
    }

    if (option === "continue_simulation") {
      handleScenarioComplete(setMessages);
      return true;
    }

    // Support object payloads like { value: "restart" }
    if (option && typeof option === "object" && option.value === "restart") {
      resetSimulationState();
      startScenarioSimulation(scenarioList, setMessages);
      return true;
    }

    if (option === "restart") {
      resetSimulationState();
      startScenarioSimulation(scenarioList, setMessages);
      return true;
    }

    return false;
  };

  const handleUserInput = (userAnswer, setMessages) => {
    if (!simulationState.waitingForInput) return false;

    // Add user's answer as a message
    const userMsg = {
      id: generateId(),
      type: "text",
      content: userAnswer,
      timestamp: generateTimestamp(),
      isUser: true,
    };

    setMessages((prevMessages) => [...prevMessages, userMsg]);

    // Process the answer
    const listToUse =
      scenarioList.length > 0 ? scenarioList : defaultScenarioList;
    const currentScenario = listToUse[simulationState.currentScenarioIndex];
    const currentKey =
      currentScenario?.scenarioKey ||
      currentScenario?.type ||
      scenarioKeys[simulationState.currentScenarioIndex] ||
      `scenario_${simulationState.currentScenarioIndex + 1}`;
    const scenarioData = currentScenario || scenarioSimulations[currentKey];
    const isAppropriate = checkIfAppropriate(userAnswer, scenarioData);
    const currentAttempt = simulationState.attempts + 1;

    void logAction({
      actionType: ACTION_TYPES.SIMULATION_INPUT,
      actionDetails: `Scenario response evaluated: ${isAppropriate ? "appropriate" : "inappropriate"}`,
      scenarioType: currentKey,
      scenarioIndex: simulationState.currentScenarioIndex,
      retryCount: currentAttempt - 1,
      response: userAnswer,
      isAppropriate,
    });

    if (isAppropriate) {
      // Correct answer
      const feedbackMsg = {
        id: generateId(),
        type: "text",
        content: "Nice answer.",
        timestamp: generateTimestamp(),
        isUser: false,
      };

      setMessages((prevMessages) => [...prevMessages, feedbackMsg]);

      // Continue to next scenario after delay
      setTimeout(() => {
        handleScenarioComplete(setMessages);
      }, 2000);
    } else {
      // Incorrect answer
      if (currentAttempt < 3) {
        // Show hint
        const hintMsg = {
          id: generateId(),
          type: "text",
          content: "Look at the example answer below and try again.",
          timestamp: generateTimestamp(),
          isUser: false,
        };

        setMessages((prevMessages) => [...prevMessages, hintMsg]);

        // Update attempts and continue waiting for input
        setSimulationState((prev) => ({
          ...prev,
          attempts: currentAttempt,
        }));
      } else {
        // Max attempts reached
        const finalMsg = {
          id: generateId(),
          type: "text",
          content: "That's okay. One possible answer is... Let's keep going.",
          timestamp: generateTimestamp(),
          isUser: false,
        };

        setMessages((prevMessages) => [...prevMessages, finalMsg]);

        // Continue to next scenario after delay
        setTimeout(() => {
          handleScenarioComplete(setMessages);
        }, 2000);
      }
    }

    // Only clear waiting for input state if we're moving to next scenario
    if (isAppropriate || currentAttempt >= 3) {
      setSimulationState((prev) => ({
        ...prev,
        waitingForInput: false,
      }));
    }

    return true;
  };

  const checkIfAppropriate = (answer, scenarioData) => {
    const lowerAnswer = answer.toLowerCase();

    // Check for inappropriate keywords/phrases
    const inappropriatePatterns = [
      "yes",
      "okay",
      "sure",
      "fine",
      "whatever",
      "i guess",
      "accept",
      "take it",
      "drink",
      "alcohol",
      "beer",
      "wine",
      "shot",
      "let's drink",
      "i'll drink",
      "one drink",
      "just one",
    ];

    // Check for appropriate keywords/phrases
    const appropriatePatterns = [
      "no",
      "no thanks",
      "i'm good",
      "not drinking",
      "don't drink",
      "i'm not drinking",
      "i don't drink",
      "not tonight",
      "i'll pass",
      "water",
      "food",
      "quiet night",
      "cheers to you",
      "maybe next time",
    ];

    // Check for inappropriate patterns
    const hasInappropriate = inappropriatePatterns.some((pattern) =>
      lowerAnswer.includes(pattern)
    );

    // Check for appropriate patterns
    const hasAppropriate = appropriatePatterns.some((pattern) =>
      lowerAnswer.includes(pattern)
    );

    // If answer contains both, check the context
    if (hasInappropriate && hasAppropriate) {
      return (
        hasAppropriate &&
        !lowerAnswer.includes("drink") &&
        !lowerAnswer.includes("alcohol")
      );
    }

    return hasAppropriate && !hasInappropriate;
  };

  const resetSimulationState = () => {
    setSimulationState({
      isActive: false,
      currentScenarioIndex: 0,
      completedScenarios: [],
      currentStep: 0,
      waitingForInput: false,
      attempts: 0,
    });
  };

  return {
    simulationState,
    setSimulationState,
    startScenarioSimulation,
    showNextScenario,
    handleScenarioComplete,
    handleSimulationOptionSelect,
    handleUserInput,
    resetSimulationState,
  };
};
