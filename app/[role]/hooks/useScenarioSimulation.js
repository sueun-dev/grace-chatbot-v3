import { useState } from "react";
import { scenarioSimulations } from "@/utils/questionnaire";
import { generateTimestamp } from "../components/chatService";

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

  const startScenarioSimulation = (setMessages) => {
    setSimulationState({
      isActive: true,
      currentScenarioIndex: 0,
      completedScenarios: [],
      currentStep: 0,
    });

    // Show intro message
    const introMsg = {
      id: Date.now(),
      type: "text",
      content:
        "Great! Now let's practice responding to real-life situations. You'll be presented with different scenarios where someone might pressure you to drink. Practice saying no in a way that feels comfortable for you.",
      timestamp: generateTimestamp(),
      isUser: false,
    };

    setMessages((prev) => [...prev, introMsg]);

    // Start first scenario after a brief delay
    setTimeout(() => {
      showNextScenario(setMessages, 0);
    }, 2000);
  };

  const showNextScenario = (setMessages, scenarioIndex = null) => {
    const indexToUse =
      scenarioIndex !== null
        ? scenarioIndex
        : simulationState.currentScenarioIndex;
    const currentKey = scenarioKeys[indexToUse];
    const scenarioData = scenarioSimulations[currentKey];

    // Show loading message first
    const loadingMsg = {
      id: Date.now(),
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
        id: Date.now() + 1,
        type: "scenario-simulation",
        scenarioData: scenarioData,
        timestamp: generateTimestamp(),
        isUser: false,
      };

      setMessages((prevMessages) => [...prevMessages, scenarioMsg]);

      // Set waiting for input state and reset attempts
      setSimulationState((prev) => ({
        ...prev,
        waitingForInput: true,
        attempts: 0,
      }));
    }, 1500);
  };

  const handleScenarioComplete = (setMessages) => {
    const currentKey = scenarioKeys[simulationState.currentScenarioIndex];
    const nextIndex = simulationState.currentScenarioIndex + 1;

    // Update state first
    setSimulationState((prev) => ({
      ...prev,
      completedScenarios: [...prev.completedScenarios, currentKey],
      currentScenarioIndex: nextIndex,
    }));

    // Check if all scenarios are completed
    if (nextIndex >= scenarioKeys.length) {
      console.log("All scenarios completed, showing final messages...");
      // Show final completion messages
      setTimeout(() => {
        console.log("Showing completion message 1");
        const finalAssessmentMsg = {
          id: Date.now(),
          type: "completion-message",
          content: "Great job practicing these scenarios! Your answers show self-awareness and healthy decision-making.",
          timestamp: generateTimestamp(),
          isUser: false,
        };

        setMessages((prevMessages) => [...prevMessages, finalAssessmentMsg]);

        // Show "You're not alone" message
        setTimeout(() => {
          console.log("Showing 'You're not alone' message");
          const supportMsg = {
            id: Date.now() + 1,
            type: "completion-message",
            content: "You're not alone in making healthy choices. It's okay to take small steps, ask for help, and keep practicing.",
            timestamp: generateTimestamp(),
            isUser: false,
          };

          setMessages((prevMessages) => [...prevMessages, supportMsg]);

          // Show training complete message
          setTimeout(() => {
            console.log("Showing training complete message");
            const trainingCompleteMsg = {
              id: Date.now() + 2,
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

            // Generate and show random 6-character alphanumeric code
            setTimeout(() => {
              console.log("Showing completion code");
              // Generate random 6-character alphanumeric code
              const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
              let completionCode = '';
              for (let i = 0; i < 6; i++) {
                completionCode += characters.charAt(Math.floor(Math.random() * characters.length));
              }
              console.log("Generated code:", completionCode);

              const codeMsg = {
                id: Date.now() + 3,
                type: "completion-code",
                content: completionCode,
                timestamp: generateTimestamp(),
                isUser: false,
              };

              setMessages((prevMessages) => {
                console.log("Adding completion code to messages");
                return [...prevMessages, codeMsg];
              });

              // Mark simulation as inactive AFTER all messages are shown
              console.log("Marking simulation as inactive");
              setSimulationState((prev) => ({
                ...prev,
                isActive: false,
              }));
            }, 1000);
          }, 2000);
        }, 1500);
      }, 2000);
    } else {
      // Show next scenario after a delay
      setTimeout(() => {
        showNextScenario(setMessages, nextIndex);
      }, 2000);
    }
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
      startScenarioSimulation(setMessages);
      return true;
    }

    if (option === "restart") {
      resetSimulationState();
      startScenarioSimulation(setMessages);
      return true;
    }

    return false;
  };

  const handleUserInput = (userAnswer, setMessages) => {
    if (!simulationState.waitingForInput) return false;

    // Add user's answer as a message
    const userMsg = {
      id: Date.now(),
      type: "text",
      content: userAnswer,
      timestamp: generateTimestamp(),
      isUser: true,
    };

    setMessages((prevMessages) => [...prevMessages, userMsg]);

    // Process the answer
    const currentKey = scenarioKeys[simulationState.currentScenarioIndex];
    const scenarioData = scenarioSimulations[currentKey];
    const isAppropriate = checkIfAppropriate(userAnswer, scenarioData);
    const currentAttempt = simulationState.attempts + 1;

    if (isAppropriate) {
      // Correct answer
      const feedbackMsg = {
        id: Date.now() + 1,
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
          id: Date.now() + 1,
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
          id: Date.now() + 1,
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
