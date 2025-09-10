import { Send } from "lucide-react";
import React, { useState } from "react";
import Button from "./Button";

const ChatInput = ({
  onSendMessage,
  disabled = false,
  pendingInteractiveMessage = false,
  scenarioMode = false,
}) => {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && onSendMessage && scenarioMode) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-[24px] flex flex-col gap-[16px] border-[1px] border-[#F0F2F5] bg-white rounded-[16px] box-shadow">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || !scenarioMode}
        className="disabled:cursor-not-allowed w-full rounded-[8px] p-[12px] text-[14px] text-[#666F8D] font-normal leading-[150%] outline-none border-none disabled:opacity-50"
        placeholder={
          scenarioMode
            ? "Type your response to the scenario..."
            : pendingInteractiveMessage
            ? "Please respond to the question above..."
            : "Type your message here..."
        }
      />
      <Button
        className="flex items-center gap-[8px] self-end"
        onClick={handleSend}
        disabled={!message.trim() || disabled || !scenarioMode}
      >
        <Send size={12} />
        <span>Send Message</span>
      </Button>
    </div>
  );
};

export default ChatInput;
