"use client";
import React from "react";
import { useParams } from "next/navigation";
import AiChatbot from "./components/AiChatbot";
import MedicalProfessionalChatbot from "./components/MedicalProfessionalChatbot";
import StudentChatbot from "./components/StudentChatbot";

export default function ChatBox() {
  const params = useParams();
  const role = params.role;

  const renderChatbot = () => {
    switch (role) {
      case "medical-professional":
        return <MedicalProfessionalChatbot />;
      case "ai-chatbot":
        return <AiChatbot />;
      case "student":
        return <StudentChatbot />;
    }
  };

  return (
    <div className="h-screen p-[10px] bg-[#F7F8FA]">{renderChatbot()}</div>
  );
}
