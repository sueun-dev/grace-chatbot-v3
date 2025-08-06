import { useState } from "react";
import {
  simulateAIResponse,
  generateTimestamp,
} from "../components/chatService";

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInteractiveMessage, setPendingInteractiveMessage] =
    useState(false);

  const isInteractiveMessage = (message) => {
    return (
      message.type === "multiple-choice" ||
      message.type === "options" ||
      message.type === "scenario"
    );
  };

  const handleSendMessage = async (userMessage) => {
    // Don't allow new messages if there's a pending interactive message
    if (pendingInteractiveMessage) {
      return;
    }

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: "text",
      content: userMessage,
      timestamp: generateTimestamp(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMsg]);

    // Show loading state
    setIsLoading(true);
    const loadingMsg = {
      id: Date.now() + 1,
      type: "loading",
      timestamp: generateTimestamp(),
      isUser: false,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      // Simulate AI response
      const aiResponse = await simulateAIResponse(userMessage, messages);
      const aiMsg = {
        id: Date.now() + 2,
        ...aiResponse,
        isUser: false,
      };

      // Remove loading message and add AI response
      setMessages((prev) =>
        prev.filter((msg) => msg.type !== "loading").concat(aiMsg)
      );

      // Set pending interactive message flag
      if (isInteractiveMessage(aiMsg)) {
        setPendingInteractiveMessage(true);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Remove loading message on error
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneralOptionSelect = async (option) => {
    // Check if option is a valid string (not an event object)
    if (typeof option !== "string") {
      console.warn("Invalid option type:", typeof option, option);
      return;
    }

    // Additional safety check for event objects
    if (option && typeof option === "object" && option.nativeEvent) {
      console.warn("Event object passed as option:", option);
      return;
    }

    // Add user's selection as a message
    const userMsg = {
      id: Date.now(),
      type: "text",
      content: option,
      timestamp: generateTimestamp(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMsg]);

    // Clear pending interactive message flag
    setPendingInteractiveMessage(false);

    // Show loading state
    setIsLoading(true);
    const loadingMsg = {
      id: Date.now() + 1,
      type: "loading",
      timestamp: generateTimestamp(),
      isUser: false,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      // Simulate AI response based on the option selected
      const aiResponse = await simulateAIResponse(option, messages);
      const aiMsg = {
        id: Date.now() + 2,
        ...aiResponse,
        isUser: false,
      };

      // Remove loading message and add AI response
      setMessages((prev) =>
        prev.filter((msg) => msg.type !== "loading").concat(aiMsg)
      );

      // Set pending interactive message flag if the new response is interactive
      if (isInteractiveMessage(aiMsg)) {
        setPendingInteractiveMessage(true);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      // Remove loading message on error
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"));
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setPendingInteractiveMessage(false);
  };

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    pendingInteractiveMessage,
    setPendingInteractiveMessage,
    handleSendMessage,
    handleGeneralOptionSelect,
    resetChat,
  };
};
