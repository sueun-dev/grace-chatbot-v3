"use client";
import CodeVerification from "@/app/[role]/components/ui/CodeVerification";
import WelcomeToTraining from "@/app/[role]/components/ui/WelcomeToTraining";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useLayoutEffect } from "react";
import { toast } from "sonner";
import Button from "./[role]/components/Button";
import { logAction, ACTION_TYPES } from "@/utils/clientLogger";

export default function Home() {
  const router = useRouter();
  const VIEW = {
    LANDING: "landing",
    CODE: "code",
    WELCOME: "welcome",
  };
  const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;
  const getInitialView = () => {
    if (typeof window === "undefined") return VIEW.LANDING;
    const saved = sessionStorage.getItem("onboarding_view");
    if (saved === VIEW.CODE || saved === VIEW.WELCOME) return saved;
    return VIEW.LANDING;
  };
  const [view, setView] = useState(VIEW.LANDING);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setView((prev) => {
      const nextView = getInitialView();
      return nextView === prev ? prev : nextView;
    });
  }, []);
  
  useEffect(() => {
    // Log page visit
    logAction({
      actionType: ACTION_TYPES.PAGE_VISITED,
      actionDetails: 'User visited home page',
      pageVisited: 'home'
    });
  }, []);

  useEffect(() => {
    if (view !== VIEW.WELCOME) return;
    const prefetch = () => router.prefetch("/ai-chatbot");
    if (typeof window === "undefined") return;
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(prefetch);
    } else {
      setTimeout(prefetch, 0);
    }
  }, [view, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("onboarding_view", view);
  }, [view]);

  const handleCodeVerification = () => {
    setView(VIEW.CODE);
    
    // Log button click
    void logAction({
      actionType: ACTION_TYPES.BUTTON_CLICKED,
      actionDetails: 'Get Started button clicked',
      pageVisited: 'home'
    });
  };

  const handleWelcome = () => {
    setView(VIEW.WELCOME);
    
    // Log welcome screen visit
    void logAction({
      actionType: ACTION_TYPES.PAGE_VISITED,
      actionDetails: 'User reached welcome screen',
      pageVisited: 'welcome'
    });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const code = formData.get("codeVerification");

    // Store user identifier (the code they entered)
    sessionStorage.setItem('userIdentifier', code);
    if (!sessionStorage.getItem('dwellStart')) {
      sessionStorage.setItem('dwellStart', new Date().toISOString());
    }
    
    // No validation - any code is accepted
    toast.success("Verification successful");
    handleWelcome();

    // Fire-and-forget logging to avoid blocking the UI transition.
    void logAction({
      actionType: ACTION_TYPES.CODE_ENTERED,
      actionDetails: 'User entered verification code',
      pageVisited: 'home'
    });
    void logAction({
      actionType: ACTION_TYPES.CODE_VERIFIED,
      actionDetails: 'Code verification successful',
      pageVisited: 'home'
    });
  };

  const handleChatBotRedirect = () => {
    setIsRedirecting(true);
    
    // Log chat start
    void logAction({
      actionType: ACTION_TYPES.CHAT_STARTED,
      actionDetails: 'User started chat with general AI',
      pageVisited: 'welcome'
    });
    
    // Redirect to general AI chatbot
    router.push("/ai-chatbot");
  };

  return (
    <>
      {view === VIEW.LANDING && (
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
      {view === VIEW.CODE && (
        <CodeVerification handleFormSubmit={handleFormSubmit} />
      )}
      {view === VIEW.WELCOME && (
        <WelcomeToTraining
          handleGoBack={handleCodeVerification}
          handleChatBotRedirect={handleChatBotRedirect}
          isRedirecting={isRedirecting}
        />
      )}
    </>
  );
}
