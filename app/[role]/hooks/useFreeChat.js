import { useState } from "react";
import { generateTimestamp } from "../components/chatService";
import { logAction, ACTION_TYPES } from "@/utils/clientLogger";

export const useFreeChat = () => {
  const [isFreeChatActive, setIsFreeChatActive] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Start free chat mode
  const startFreeChat = (setMessages) => {
    setIsFreeChatActive(true);
    
    const welcomeMsg = {
      id: Date.now(),
      type: "text",
      content: "You've completed all scenarios! Now you can have a free conversation with me. Feel free to ask any questions about medical practice, patient care, or discuss the scenarios we've covered.",
      timestamp: generateTimestamp(),
      isUser: false,
    };
    
    setMessages((prev) => [...prev, welcomeMsg]);
    
    // Log free chat start
    logAction({
      actionType: ACTION_TYPES.CHAT_STARTED,
      actionDetails: 'Free chat mode started',
      pageVisited: 'free-chat'
    });
  };

  // Send message to OpenAI
  const sendMessageToAI = async (userMessage, setMessages, setIsLoading) => {
    if (!isFreeChatActive) return false;

    // Add user message
    const userMsg = {
      id: Date.now(),
      type: "text",
      content: userMessage,
      timestamp: generateTimestamp(),
      isUser: true,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Log user message
    await logAction({
      actionType: ACTION_TYPES.MESSAGE_SENT,
      actionDetails: 'Free chat message sent',
      messageContent: userMessage
    });

    // Show loading
    setIsLoading(true);
    const loadingMsg = {
      id: Date.now() + 1,
      type: "loading",
      timestamp: generateTimestamp(),
      isUser: false,
    };
    setMessages((prev) => [...prev, loadingMsg]);

    try {
      // Prepare conversation history for context
      const conversationHistory = chatHistory.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add current message
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // Call OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          systemPrompt: `You are a helpful medical training assistant. You're having a conversation with a medical professional in training. 
          Be professional, informative, and supportive. You can discuss medical topics, provide guidance on patient care, 
          and help reflect on the training scenarios they've completed. Keep responses concise and relevant.`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiResponse = await response.json();
      
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"));
      
      // Add AI response
      const aiMsg = {
        id: Date.now() + 2,
        type: "text",
        content: aiResponse.content,
        timestamp: generateTimestamp(),
        isUser: false,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Update chat history
      setChatHistory((prev) => [
        ...prev,
        userMsg,
        aiMsg
      ]);

      // Log AI response
      await logAction({
        actionType: ACTION_TYPES.MESSAGE_RECEIVED,
        actionDetails: 'AI response received',
        messageContent: aiResponse.content
      });

    } catch (error) {
      console.error('Error in free chat:', error);
      
      // Remove loading message
      setMessages((prev) => prev.filter((msg) => msg.type !== "loading"));
      
      // Add error message
      const errorMsg = {
        id: Date.now() + 2,
        type: "text",
        content: "I apologize, but I'm having trouble responding right now. Please try again.",
        timestamp: generateTimestamp(),
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }

    return true;
  };

  // End free chat
  const endFreeChat = async () => {
    setIsFreeChatActive(false);
    setChatHistory([]);
    
    // Log chat end
    await logAction({
      actionType: ACTION_TYPES.SESSION_ENDED,
      actionDetails: 'Free chat ended'
    });
  };

  return {
    isFreeChatActive,
    startFreeChat,
    sendMessageToAI,
    endFreeChat,
  };
};