"use client";
import React from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import AiChatbot from "./components/AiChatbot";
import MedicalProfessionalChatbot from "./components/MedicalProfessionalChatbot";
import StudentChatbot from "./components/StudentChatbot";

const ROLE_COMPONENTS = {
  "medical-professional": MedicalProfessionalChatbot,
  "ai-chatbot": AiChatbot,
  "student": StudentChatbot,
};

export default function ChatBox() {
  const params = useParams();
  const role = params.role;

  const ChatbotComponent = ROLE_COMPONENTS[role];
  if (!ChatbotComponent) {
    notFound();
  }

  return (
    <div className="h-screen p-[10px] bg-[#F7F8FA]">
      <ChatbotComponent />
    </div>
  );
}
