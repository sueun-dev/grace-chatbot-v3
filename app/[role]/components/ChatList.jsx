"use client";
import { useRef, useEffect } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";

const ChatList = ({
  messages,
  onSendMessage,
  onOptionSelect,
  isLoading,
  currentUser,
  pendingInteractiveMessage,
  scenarioMode = false,
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="w-full lg:max-w-[80%] mx-auto h-full flex flex-col justify-between overflow-y-auto ">
      {/* Chat List Container */}
      <div className="flex-grow overflow-y-auto">
        {/* Date */}
        <div className="flex gap-[16px] items-center justify-between mb-[16px]">
          <div className="w-full h-[1px] bg-[#F0F2F5]"></div>
          <span className="text-[#023E6E] text-[12px] font-medium tracking-[1px] flex-shrink-0">
            Today{" "}
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <div className="w-full h-[1px] bg-[#F0F2F5]"></div>
        </div>
        {/* Chat Messages */}
        <div className="flex flex-col gap-[16px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`${message.isUser ? "w-fit" : "w-full md:w-[80%]"}`}
              >
                <ChatMessage
                  message={message}
                  isUser={message.isUser}
                  onAnswer={onOptionSelect}
                  onOptionSelect={onOptionSelect}
                  currentUser={currentUser}
                />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      {/* Chat Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={isLoading}
        pendingInteractiveMessage={pendingInteractiveMessage}
        scenarioMode={scenarioMode}
      />
    </div>
  );
};

export default ChatList;
