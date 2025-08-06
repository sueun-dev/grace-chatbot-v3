"use client";
import CodeVerification from "@/app/[role]/components/ui/CodeVerification";
import WelcomeToTraining from "@/app/[role]/components/ui/WelcomeToTraining";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Button from "./[role]/components/Button";

export default function Home() {
  const router = useRouter();
  const routes = ["/medical-professional", "/ai-chatbot", "/student"];
  const [showCodeVerification, setShowCodeVerification] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleCodeVerification = () => {
    setShowCodeVerification(true);
    setShowWelcome(false);
  };

  const handleWelcome = () => {
    setShowWelcome(true);
    setShowCodeVerification(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const code = formData.get("codeVerification");
    if (code !== "123456") {
      toast.error("Invalid verification code");
      return;
    }
    toast.success("Verification successful");
    handleWelcome();
  };

  const handleChatBotRedirect = () => {
    setShowWelcome(false);
    setShowCodeVerification(false);
    const randomRoute = routes[Math.floor(Math.random() * routes.length)];
    router.push(randomRoute);
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
