"use client";
import CodeVerification from "@/app/[role]/components/ui/CodeVerification";
import WelcomeToTraining from "@/app/[role]/components/ui/WelcomeToTraining";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Button from "./[role]/components/Button";
import { logAction, ACTION_TYPES } from "@/utils/clientLogger";

export default function Home() {
  const router = useRouter();
  const routes = ["/medical-professional", "/ai-chatbot", "/student"];
  const [showCodeVerification, setShowCodeVerification] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  
  useEffect(() => {
    // Log page visit
    logAction({
      actionType: ACTION_TYPES.PAGE_VISITED,
      actionDetails: 'User visited home page',
      pageVisited: 'home'
    });
  }, []);

  const handleCodeVerification = async () => {
    setShowCodeVerification(true);
    setShowWelcome(false);
    
    // Log button click
    await logAction({
      actionType: ACTION_TYPES.BUTTON_CLICKED,
      actionDetails: 'Get Started button clicked',
      pageVisited: 'home'
    });
  };

  const handleWelcome = async () => {
    setShowWelcome(true);
    setShowCodeVerification(false);
    
    // Log welcome screen visit
    await logAction({
      actionType: ACTION_TYPES.PAGE_VISITED,
      actionDetails: 'User reached welcome screen',
      pageVisited: 'welcome'
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const code = formData.get("codeVerification");
    
    // Store user identifier (the code they entered)
    sessionStorage.setItem('userIdentifier', code);
    
    // Log code entry
    await logAction({
      actionType: ACTION_TYPES.CODE_ENTERED,
      actionDetails: 'User entered verification code',
      pageVisited: 'home'
    });
    
    // No validation - any code is accepted
    toast.success("Verification successful");
    
    // Log successful verification
    await logAction({
      actionType: ACTION_TYPES.CODE_VERIFIED,
      actionDetails: 'Code verification successful',
      pageVisited: 'home'
    });
    
    handleWelcome();
  };

  const handleChatBotRedirect = async () => {
    setShowWelcome(false);
    setShowCodeVerification(false);
    
    // Log chat start
    await logAction({
      actionType: ACTION_TYPES.CHAT_STARTED,
      actionDetails: 'User started chat with student (friend)',
      pageVisited: 'welcome'
    });
    
    // Redirect to student (friend) chatbot
    router.push("/student");
  };

  return (
    <>
      {!showCodeVerification && !showWelcome && (
        <div className="relative px-[32px] md:px-[64px] flex flex-col  pt-[40px] min-h-screen bg-[#F6F6F2]">
          <div className=" absolute left-6 top-6">
            <Image src="/logo.svg" width={150} height={80} alt="Logo" />
          </div>
          <div className="flex flex-col justify-between flex-grow items-center mt-[100px]">
            <p className="text-[32px] leading-[38px] font-semibold text-[#000000] ">
              Welcome to the
            </p>
            <div>
              <Image src="/logo3.svg" width={365} height={80} alt="logo" />
            </div>
            <Button
              onClick={handleCodeVerification}
              className="w-fit flex items-center gap-2"
            >
              {"Let's Get Started"}
              <Image
                src="/arrow-right.svg"
                width={24}
                height={24}
                alt="arrow"
              />
            </Button>

            <Image src="/hands.svg" width={471} height={471} alt="logo" />
          </div>
        </div>
      )}
      {showCodeVerification && (
        <CodeVerification handleFormSubmit={handleFormSubmit} />
      )}
      {showWelcome && (
        <WelcomeToTraining
          handleGoBack={handleCodeVerification}
          handleChatBotRedirect={handleChatBotRedirect}
        />
      )}
    </>
  );
}
